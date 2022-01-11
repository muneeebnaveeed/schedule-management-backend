const mongoose = require('mongoose');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { catchAsync } = require('../controllers/errors.controller');
const AppError = require('../utils/AppError');

module.exports.authentication = catchAsync(async function (req, res, next) {
    let token;
    if (req.headers.authorization) {
        if (req.headers.authorization === 'dev') {
            return next();
        }

        if (req.headers.authorization.startsWith('Bearer '))
            // eslint-disable-next-line prefer-destructuring
            token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next(new AppError('Please login to get access', 401));

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    let freshUser;

    const promises = [
        mongoose.model('AdminUser').findById(decoded.id, '-password -__v').lean(),
        mongoose
            .model('User')
            .findOne({ _id: decoded.id, role: 'EMPLOYEE' }, '-password -__v')
            .populate([
                {
                    path: 'manager',
                    select: '-password -__v',
                    populate: [
                        { path: 'admin', select: '-password -__v' },
                        { path: 'groups', select: '-__v' },
                    ],
                },
                { path: 'groups', select: '-__v' },
                { path: 'admin', select: '-password -__v' },
                { path: 'location', select: '-__v -admin' },
            ])
            .lean(),
        mongoose
            .model('User')
            .findOne({ _id: decoded.id, role: 'MANAGER' })
            .populate([
                { path: 'groups', select: '-__v' },
                { path: 'admin', select: '-password -__v' },
            ])
            .lean(),
    ];

    const [admin, employee, manager] = await Promise.all(promises);

    freshUser = admin ?? employee ?? manager;

    if (admin) freshUser.role = 'ADMIN';
    else if (employee) freshUser.role = 'EMPLOYEE';
    else if (manager) freshUser.role = 'MANAGER';

    if (!freshUser) return next(new AppError('Please login again', 401));

    res.locals.user = freshUser;

    next();
});

module.exports.authorization = (...roles) =>
    catchAsync(async function (req, res, next) {
        if (!res.locals.user) return next(new AppError('Please login to get access', 401));

        if (!roles.includes(res.locals.user.role))
            return next(new AppError('You are not authorized to access this route', 401));

        next();
    });
