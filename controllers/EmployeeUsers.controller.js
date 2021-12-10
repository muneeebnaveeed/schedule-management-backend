const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const requestIp = require('request-ip');
const { signToken } = require('../utils/jwt');
const Model = require('../models/employeeUsers.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email', 'password']);
    console.log({ body });
    if (Object.keys(body).length < 2) return next(new AppError('Please enter email and password', 400));

    const user = await mongoose
        .model('User')
        .findOne({ email: body.email }, 'name email password isConfirmed isPasswordSet')
        .populate({ path: 'manager', select: 'name' });
    if (!user) return next(new AppError('Invalid email or password', 401));
    const isValidPassword = await user.isValidPassword(body.password, user.password);

    if (!isValidPassword) return next(new AppError('Invalid email or password', 401));
    if (!user.isConfirmed) return next(new AppError('Your Access is pending', 403));
    const token = signToken({ id: user._id });

    const filteredUser = _.pick(user, ['_id', 'name', 'email', 'isPasswordSet', 'manager']);

    res.status(200).json({
        token,
        ...filteredUser,
    });
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
module.exports.startTracking = catchAsync(async function (req, res, next) {
    const employeeUser = res.locals.user;
    // const coordinates = _.pick(req.body.coordinates, ['lat', 'long']);
    const body = _.pick(req.body, ['ip', 'coordinates']);
    const clientIp = requestIp.getClientIp(req);
    res.status(200).send(clientIp);
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
