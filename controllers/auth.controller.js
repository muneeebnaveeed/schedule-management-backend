const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { signToken } = require('../utils/jwt');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');
const AdminUser = require('../models/adminUsers.model');
const User = require('../models/users.model');
const sgMail = require('@sendgrid/mail');

module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email', 'password']);
    if (Object.keys(body).length < 2) return next(new AppError('Please enter email and password', 400));

    const [admin, manager] = await Promise.all([
        mongoose.model('AdminUser').findOne({ email: body.email }),
        mongoose.model('User').findOne({ email: body.email }),
    ]);

    if (!admin && !manager) return next(new AppError('Invalid email or password', 401));
    let isValidPassword;
    let token;
    let filteredUser;
    if (admin) {
        isValidPassword = await admin.isValidPassword(body.password, admin.password);
        if (!isValidPassword) return next(new AppError('Invalid email or password', 401));
        token = signToken({ id: admin._id });
        filteredUser = { ..._.pick(admin, ['_id', 'name', 'email']), role: 'ADMIN' };
    } else if (manager) {
        if (!manager.isConfirmed) return next(new AppError('Your access is pending', 403));
        isValidPassword = await manager.isValidPassword(body.password, manager.password);
        if (!isValidPassword) return next(new AppError('Invalid email or password', 401));

        token = signToken({ id: manager._id });
        filteredUser = _.pick(manager, ['_id', 'name', 'email', 'role']);
    }

    res.status(200).json({
        token,
        ...filteredUser,
    });
});

module.exports.registerAdmin = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['name', 'email', 'password', 'passwordConfirm']);
    const user = await AdminUser.create(body);
    const token = signToken({ id: user._id });

    res.status(200).json({ token, _id: user._id, name: user.name, email: user.email, role: 'ADMIN' });
});

module.exports.acceptManager = catchAsync(async function (req, res, next) {
    const { token } = req.body;
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const { adminid, managerid } = decoded;
    const manager = await mongoose.model('User').findById(managerid);
    if (!manager) return next(new AppError('Manager does not exists', 400));
    if (manager.admin.toString() !== adminid) return next(new AppError('Invalid Token', 403));
    const newUser = _.pick(req.body, ['name', 'password', 'passwordConfirm']);
    if (!Object.keys(newUser).length) return next(new AppError('Please enter a valid user', 400));

    manager.name = newUser.name;
    manager.password = newUser.password;
    manager.passwordConfirm = newUser.passwordConfirm;
    manager.isConfirmed = true;
    await manager.save();
    const signedToken = signToken({ id: manager._id });

    res.status(200).json({
        token: signedToken,
        _id: manager._id,
        name: manager.name,
        email: manager.email,
        role: manager.role,
    });
});

module.exports.decodeToken = catchAsync(async function (req, res, next) {
    const { token } = req.params;
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const [admin, manager] = await Promise.all([
        AdminUser.findById(decoded.id, { __v: 0, password: 0 }).lean(),
        User.findById(decoded.id, { __v: 0, password: 0 }).populate({ path: 'admin', select: '-password -__v' }).lean(),
    ]);
    res.status(200).json({ ...admin, role: admin ? 'ADMIN' : 'MANAGER', ...manager });
});

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;

    const results = await Model.paginate(
        {
            $or: [
                { name: { $regex: `${search}`, $options: 'i' } },
                { username: { $regex: `${search}`, $options: 'i' } },
            ],
        },
        { projection: { __v: 0, password: 0 }, lean: true, page, limit, sort: { isConfirmed: 1, ...sort } }
    );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.getOne = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) return next(new AppError('Invalid employee id', 400));

    const doc = await Model.findById(id, { __v: 0 }).lean();

    if (!doc) return next(new AppError('Employee does not exist', 404));

    res.status(200).json(doc);
});

module.exports.register = catchAsync(async function (req, res, next) {
    const newUser = _.pick(req.body, ['name', 'username', 'password', 'passwordConfirm']);
    if (!Object.keys(newUser).length) return next(new AppError('Please enter a valid user', 400));
    await Model.create(newUser);

    res.status(200).json();
});

module.exports.inviteEmployee = catchAsync(async function (req, res, next) {
    const newUser = _.pick(req.body, ['username', 'name']);

    await Model.create(newUser);

    res.status(200).json();
});

module.exports.setPassword = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid employee id', 400));

    const user = await mongoose.model('User').findById(id);

    if (!user) return next(new AppError('Employee does not exist', 404));

    user.password = req.body.password;
    user.isPasswordSet = true;
    await user.save();

    res.status(200).send();
});

module.exports.assignManager = catchAsync(async function (req, res, next) {
    const { employeeid } = req.params;
    const { managerid } = req.body;

    if (!employeeid || !mongoose.isValidObjectId(employeeid))
        return next(new AppError('Please enter a valid employee id', 400));

    if (!managerid || !mongoose.isValidObjectId(managerid))
        return next(new AppError('Please enter a valid manager id', 400));

    const [user, manager] = await Promise.all([
        Model.findById(employeeid),
        mongoose.model('ManagerUsers').findById(managerid),
    ]);

    if (!user) return next(new AppError('Employee does not exist', 404));
    if (!manager) return next(new AppError('Manager does not exist', 404));

    user.manager = managerid;
    await user.save();

    res.status(200).send();
});

module.exports.assignSchedule = catchAsync(async function (req, res, next) {
    const { employeeid } = req.params;
    const { scheduleid } = req.body;

    if (!employeeid || !mongoose.isValidObjectId(employeeid))
        return next(new AppError('Please enter a valid employee id', 400));

    if (!scheduleid || !mongoose.isValidObjectId(scheduleid))
        return next(new AppError('Please enter a valid schedule id', 400));

    const [user, schedule] = await Promise.all([
        Model.findById(employeeid),
        mongoose.model('Schedule').findById(scheduleid),
    ]);

    if (!user) return next(new AppError('Employee does not exist', 404));
    if (!schedule) return next(new AppError('Manager does not exist', 404));

    user.schedule = scheduleid;
    await user.save();

    res.status(200).send();
});

module.exports.remove = catchAsync(async function (req, res, next) {
    let ids = req.params.id.split(',');

    for (const id of ids) {
        if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));
    }

    ids = ids.map((id) => mongoose.Types.ObjectId(id));

    await Model.deleteMany({ _id: { $in: ids } });

    res.status(200).json();
});

module.exports.requestForgetPassword = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email']);

    const [admin, manager] = await Promise.all([
        AdminUser.findOne({ email: body.email }).lean(),
        User.findOne({ email: body.email }).lean(),
    ]);

    if (!admin && !manager) return next(new AppError('This email does not belong to any user', 404));

    let payload = {};
    if (admin) payload = { id: admin._id, type: 'ADMIN' };
    else payload = { id: manager._id, type: 'MANAGER' };

    const token = signToken(payload);
    await sgMail.send({
        to: body.email, // Change to your recipient
        from: process.env.SENDGRID_SENDER_EMAIL, // Change to your verified sender
        subject: `Schedule Management App - Forget Password`,
        // text: 'and easy to do anywhere, even with Node.js',
        html: `<body>
                    You have requested to change your password.
                    <a href="https://fyz-schedule-management.herokuapp.com/change-password?token=${token}">
                        Accept Invitation
                    </a>
            </body > `,
    });

    res.status(200).send();
});

module.exports.changePassword = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['password', 'passwordConfirm']);
    const { token } = req.query;

    console.log(token);

    let user = null;
    const { type, id } = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    if (type === 'MANAGER') user = await User.findById(id);
    else user = await mongoose.model('AdminUser').findById(id);

    if (!user) return next(new AppError('Invalid user', 404));

    user.password = body.password;
    user.passwordConfirm = body.passwordConfirm;
    await user.save();

    res.status(200).send();
});
