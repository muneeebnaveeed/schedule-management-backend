const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');

const validator = require('email-validator');
const fs = require('file-system');
const csv = require('csvtojson');
const path = require('path');
const { signToken } = require('../utils/jwt');
const Model = require('../models/adminUsers.model');
const User = require('../models/users.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort = { _id: 1 }, search, filters } = req.query;

    let queryByManager = {};

    if (res.locals.user.admin && filters.length === 1 && filters[0] === 'EMPLOYEE')
        queryByManager = { manager: res.locals.user._id };

    const results = await mongoose.model('User').paginate(
        {
            $and: [
                {
                    $or: [
                        { name: { $regex: `${search}`, $options: 'i' } },
                        { email: { $regex: `${search}`, $options: 'i' } },
                    ],
                },
                {
                    role: { $in: filters },
                    admin: res.locals.user.admin?._id || res.locals.user._id,
                },
                queryByManager,
            ],
        },
        {
            projection: { __v: 0, password: 0 },
            populate: [
                { path: 'manager', select: '_id email name' },
                { path: 'location', select: '_id name' },
            ],
            lean: true,
            page,
            limit,
            sort,
        }
    );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.remove = catchAsync(async function (req, res, next) {
    let ids = req.params.id.split(',');

    for (const id of ids) {
        if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));
    }

    ids = ids.map((id) => mongoose.Types.ObjectId(id));

    await mongoose.model('User').deleteMany({ _id: { $in: ids } });

    res.status(200).json();
});
module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email', 'password']);

    if (Object.keys(body).length < 2) return next(new AppError('Please enter email and password', 400));

    const user = await Model.findOne({ email: body.email });

    if (!user) return next(new AppError('Invalid email or password', 401));

    const isValidPassword = await user.isValidPassword(body.password, user.password);

    if (!isValidPassword) return next(new AppError('Invalid email or password', 401));

    const token = signToken({ id: user._id });

    const filteredUser = _.pick(user, ['_id', 'name', 'email']);

    res.status(200).json({
        token,
        ...filteredUser,
    });
});

module.exports.inviteManagers = catchAsync(async function (req, res, next) {
    const emails = [...new Set(req.params.emails.replace(/\s/g, '').split(','))];
    const adminUser = res.locals.user;
    for (const email of emails) {
        if (!validator.validate(email)) return next(new AppError('One or more emails are invalid', 400));
    }

    const [managers, admins] = await Promise.all([
        mongoose
            .model('User')
            .find({ role: 'MANAGER', email: { $in: emails } })
            .lean(),
        mongoose
            .model('AdminUser')
            .find({ email: { $in: emails } })
            .lean(),
    ]);

    if (managers.length > 0 || admins.length > 0)
        return next(new AppError('One or more emails are already in use', 400));

    for (const email of emails) {
        const ManagerUser = await mongoose.model('User').create({ email, admin: res.locals.user._id, role: 'MANAGER' });
        const token = signToken({ adminid: adminUser._id, managerid: ManagerUser._id });
        await sgMail.send({
            to: email, // Change to your recipient
            from: process.env.SENDGRID_SENDER_EMAIL, // Change to your verified sender
            subject: `Schedule Management App Invitation`,
            // text: 'and easy to do anywhere, even with Node.js',
            html: `<body> ${adminUser.name} invited you to be a manager of Schedule Management Application.
            <br/>Please follow the link to continue:
            <br/><br/>
            <a href="https://fyz-schedule-management.herokuapp.com/accept-manager-invitation?token=${token}"
            > Accept Invitation</a>
            </body > `,
        });
    }

    res.status(200).send();
});

module.exports.importEmployees = catchAsync(async function (req, res, next) {
    let groups = [];
    if (req.query.groups !== 'null') {
        groups = req.query.groups.split(',');
        for (const group of groups) {
            if (!mongoose.isValidObjectId(group)) return next(new AppError('Please enter valid id(s)', 400));
        }
        groups = groups.map((id) => mongoose.Types.ObjectId(id));
    }
    const employees = await csv().fromString(req.file.buffer.toString());
    for (const employee of employees) {
        await User.create({
            ...employee,
            passwordConfirm: employee.password,
            groups,
            admin: res.locals.user._id,
            role: 'EMPLOYEE',
        });
    }
    res.status(200).json();
});

module.exports.getSampleFile = catchAsync(async function (req, res, next) {
    res.download(path.join(__dirname, '..', 'public/sample-employees.csv'));
});

module.exports.decodeToken = catchAsync(async function (req, res, next) {
    const { token } = req.params;
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const admin = await mongoose.model('AdminUser').findById(decoded.id, { __v: 0, password: 0 }).lean();
    if (!admin) return next(new AppError('User does not exist'));

    res.status(200).json(admin);
});

module.exports.assignManager = catchAsync(async function (req, res, next) {
    const adminid = res.locals.user._id;
    const employeeids = [...new Set(req.body.employeeids)];
    const { managerid } = req.params;
    const locationid = req.body.location;
    if (!locationid || !mongoose.isValidObjectId(locationid))
        return next(new AppError('Please enter a valid location id', 400));

    const location = await mongoose.model('Location').findById(locationid);
    if (!location) return next(new AppError('Location does not exist', 404));

    if (!managerid || !mongoose.isValidObjectId(managerid))
        return next(new AppError('Please enter a valid manager id', 400));
    const manager = await mongoose.model('User').findById(managerid);
    if (!manager) return next(new AppError('Manager does not exist', 404));
    if (manager.role !== 'MANAGER') return next(new AppError('Manager does not exist', 404));

    for (const employeeid of employeeids) {
        if (!employeeid || !mongoose.isValidObjectId(employeeid))
            return next(new AppError('Please enter a valid id', 400));
    }
    const employees = await mongoose
        .model('User')
        .find({
            _id: {
                $in: employeeids,
            },
            admin: adminid,
        })
        .lean();
    if (employeeids.length !== employees.length) return next(new AppError('Invalid Employees', 400));
    await mongoose.model('User').updateMany(
        {
            _id: {
                $in: employeeids,
            },
        },
        { manager: managerid, location: locationid, isConfirmed: true }
    );
    res.status(200).send();
});
