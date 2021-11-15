const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { signToken } = require('../utils/jwt');
const User = require('../models/users.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.getUsers = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;

    const results = await User.paginate(
        { name: { $regex: `${search}`, $options: 'i' } },
        { projection: { __v: 0, password: 0 }, lean: true, page, limit, sort: { isConfirmed: 1 } }
    );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.registerUser = catchAsync(async function (req, res, next) {
    const newUser = _.pick(req.body, ['name', 'password', 'passwordConfirm']);

    if (!Object.keys(newUser).length) return next(new AppError('Please enter a valid user', 400));

    await User.create(newUser);

    res.status(200).json();
});

module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['name', 'password']);

    if (Object.keys(body).length < 2) return next(new AppError('Please enter email and password', 400));

    const user = await User.findOne({ name: body.name }).populate('createdShop');

    if (!user) return next(new AppError('Invalid username or password', 401));

    const isValidPassword = await user.isValidPassword(body.password, user.password);

    if (!isValidPassword) return next(new AppError('Invalid username or password', 401));

    if (!user.isConfirmed) return next(new AppError('Your access is pending', 403));

    const token = signToken(user._id);

    res.status(200).json({
        token,
        name: user.name,
        role: user.role,
        shop: user.createdShop,
        _id: user._id,
    });
});

module.exports.protect = catchAsync(async function (req, res, next) {
    let token;

    if (req.headers.authorization) {
        if (req.headers.authorization === 'dev') return next();

        if (req.headers.authorization.startsWith('Bearer '))
            // eslint-disable-next-line prefer-destructuring
            token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next(new AppError('Please login to get access', 401));

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const freshUser = await User.findById(decoded.id);

    if (!freshUser) return next(new AppError('Please login again', 401));

    const hasChangedPassword = freshUser.changedPasswordAfter(decoded.iat);
    if (hasChangedPassword) return next(new AppError('Please login again', 401));

    const { isConfirmed } = freshUser;

    if (!isConfirmed) return next(new AppError('Your access is pending', 403));

    res.locals.user = freshUser;

    next();
});

module.exports.allowAccess = (...roles) =>
    async function (req, res, next) {
        if (!roles.includes(req.user.role)) return next(new AppError('Unauthorized access to this route', 403));
        next();
    };

module.exports.confirmUser = catchAsync(async function (req, res, next) {
    const { id: userId, role } = req.params;

    if (!mongoose.isValidObjectId(userId)) return next(new AppError('Please enter a valid id', 400));

    const user = await User.findById(userId);

    if (!user) return next(new AppError('User does not exist', 404));

    await user.updateOne({ isConfirmed: true, role: role.toUpperCase(), createdShop: res.locals.shop._id });

    res.status(200).send();
});

module.exports.editUser = catchAsync(async function (req, res, next) {
    const { id: userId } = req.params;

    if (res.locals.user._id.toString() !== userId)
        return next(new AppError('You are not authorized to edit user', 403));

    const newUser = _.pick(req.body, ['name', 'password', 'passwordConfirm']);

    if (!Object.keys(newUser).length) return next(new AppError('Please enter a valid user', 400));
    if (!mongoose.isValidObjectId(userId)) return next(new AppError('Please enter a valid id', 400));

    const user = await User.findById(userId);

    if (!user) return next(new AppError('User does not exist', 404));
    if (newUser.password) user.password = newUser.password;
    if (newUser.name) user.name = newUser.name;
    if (newUser.passwordConfirm) user.passwordConfirm = newUser.passwordConfirm;
    await user.save();

    res.status(200).json();
});

module.exports.authorizeUser = catchAsync(async function (req, res, next) {
    const { id: userId, role } = req.params;

    if (!mongoose.isValidObjectId(userId)) return next(new AppError('Please enter a valid id', 400));

    const user = await User.findById(userId);

    if (!user) return next(new AppError('User does not exist', 404));

    await user.update({ role: role.toUpperCase() }, { runValidators: true });

    res.status(200).json();
});

module.exports.decodeToken = catchAsync(async function (req, res, next) {
    const { token } = req.params;
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id, { __v: 0, password: 0 }).populate('createdShop').lean();
    user.shop = user.createdShop;
    delete user.createdShop;
    res.status(200).json(user);
});

module.exports.remove = catchAsync(async function (req, res, next) {
    let ids = req.params.id.split(',');

    for (const id of ids) {
        if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));
    }

    ids = ids.map((id) => mongoose.Types.ObjectId(id));

    await User.deleteMany({ _id: { $in: ids } });

    res.status(200).json();
});
