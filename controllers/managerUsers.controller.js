const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Parser } = require('json2csv');
const dayjs = require('dayjs');
const localizedFormat = require('dayjs/plugin/localizedFormat');
const { signToken } = require('../utils/jwt');

dayjs.extend(localizedFormat);
const Model = require('../models/managerUsers.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.register = catchAsync(async function (req, res, next) {
    const newUser = _.pick(req.body, ['name', 'username', 'password', 'passwordConfirm']);
    if (!Object.keys(newUser).length) return next(new AppError('Please enter a valid user', 400));
    await Model.create(newUser);

    res.status(200).json();
});

module.exports.approve = catchAsync(async function (req, res, next) {
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

module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['username', 'password']);

    if (Object.keys(body).length < 2) return next(new AppError('Please enter username and password', 400));

    const user = await Model.findOne({ username: body.username });

    if (!user) return next(new AppError('Invalid username or password', 401));

    const isValidPassword = await user.isValidPassword(body.password, user.password);

    if (!isValidPassword) return next(new AppError('Invalid username or password', 401));

    if (!user.isConfirmed) return next(new AppError('Your access is pending', 403));

    const token = signToken(user._id);

    res.status(200).json({
        token,
        name: user.name,
        username: user.username,
        _id: user._id,
    });
});

module.exports.getUsers = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;

    const results = await Model.paginate(
        {
            $or: [
                { name: { $regex: `${search}`, $options: 'i' } },
                { username: { $regex: `${search}`, $options: 'i' } },
            ],
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
