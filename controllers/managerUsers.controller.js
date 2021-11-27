const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Parser } = require('json2csv');
const dayjs = require('dayjs');
const localizedFormat = require('dayjs/plugin/localizedFormat');
const { promisify } = require('util');
const { signToken } = require('../utils/jwt');

dayjs.extend(localizedFormat);
const Model = require('../models/managerUsers.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.register = catchAsync(async function (req, res, next) {
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

module.exports.approveUser = catchAsync(async function (req, res, next) {
    const { userid, locationid } = req.body;

    if (!userid || !mongoose.isValidObjectId(userid)) return next(new AppError('Invalid user id', 400));
    if (!locationid || !mongoose.isValidObjectId(locationid)) return next(new AppError('Invalid location id', 400));

    const [user, location] = await Promise.all([
        Model.findOne({ _id: userid }),
        mongoose.model('Location').findOne({ _id: locationid }),
    ]);
    if (!user) return next(new AppError('Invalid user', 401));
    if (!location) return next(new AppError('Invalid location', 401));
    user.isConfirmed = true;
    user.location = locationid;
    await user.save();
    res.status(200).json();
});

module.exports.approveManager = catchAsync(async function (req, res, next) {
    // const { userid, locationid } = req.body;
    // if (!userid || !mongoose.isValidObjectId(userid)) return next(new AppError('Invalid user id', 400));
    // if (!locationid || !mongoose.isValidObjectId(locationid)) return next(new AppError('Invalid location id', 400));
    // const [user, location] = await Promise.all([
    //     Model.findOne({ _id: userid }),
    //     mongoose.model('Location').findOne({ _id: locationid }),
    // ]);
    // if (!user) return next(new AppError('Invalid user', 401));
    // if (!location) return next(new AppError('Invalid location', 401));
    // user.isConfirmed = true;
    // user.location = locationid;
    // await user.save();
    res.status(200).json();
});

module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email', 'password']);

    if (Object.keys(body).length < 2) return next(new AppError('Please enter email and password', 400));

    const user = await Model.findOne({ email: body.email });

    if (!user) return next(new AppError('Invalid email or password', 401));
    if (!user.isConfirmed) return next(new AppError('Your access is pending', 403));

    const isValidPassword = await user.isValidPassword(body.password, user.password);

    if (!isValidPassword) return next(new AppError('Invalid email or password', 401));

    if (!user.isConfirmed) return next(new AppError('Your access is pending', 403));

    const token = signToken({ id: user._id });

    res.status(200).json({
        token,
        name: user.name,
        email: user.email,
        _id: user._id,
    });
});

module.exports.getUsers = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;

    const results = await Model.paginate(
        {
            $or: [{ name: { $regex: `${search}`, $options: 'i' } }, { email: { $regex: `${search}`, $options: 'i' } }],
        },
        { projection: { __v: 0, password: 0 }, lean: true, page, limit, sort: sort || { isConfirmed: 1 } }
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

    await Model.deleteMany({ _id: { $in: ids } });

    res.status(200).json();
});
module.exports.editUser = catchAsync(async function (req, res, next) {
    const { id: userId } = req.params;

    const newUser = _.pick(req.body, ['name', 'password', 'passwordConfirm']);

    if (!Object.keys(newUser).length) return next(new AppError('Please enter a valid user', 400));
    if (!mongoose.isValidObjectId(userId)) return next(new AppError('Please enter a valid id', 400));

    const user = await Model.findById(userId);

    if (!user) return next(new AppError('User does not exist', 404));
    if (newUser.password) user.password = newUser.password;
    if (newUser.name) user.name = newUser.name;
    if (newUser.passwordConfirm) user.passwordConfirm = newUser.passwordConfirm;
    await user.save();

    res.status(200).json();
});

module.exports.decodeToken = catchAsync(async function (req, res, next) {
    const { token } = req.params;
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const manager = await mongoose.model('User').findById(decoded.id, { __v: 0, password: 0 }).lean();
    if (!manager) return next(new AppError('User does not exist'));
    res.status(200).json(manager);
});
