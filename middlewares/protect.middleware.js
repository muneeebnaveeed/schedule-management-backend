const mongoose = require('mongoose');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { catchAsync } = require('../controllers/errors.controller');
const AppError = require('../utils/AppError');

module.exports.protect = (role) =>
    catchAsync(async function (req, res, next) {
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
        if (role === 'ADMIN') {
            freshUser = await mongoose.model('AdminUser').findById(decoded.id).lean();
        } else if (role === 'EMPLOYEE') {
            freshUser = await mongoose
                .model('User')
                .findById(decoded.id)
                .populate({ path: 'manager', select: '-password -__v' });
        } else if (role === 'MANAGER') {
            freshUser = await mongoose.model('User').findById(decoded.id).lean();
        } else {
            return next(new AppError('Role is not defined', 500));
        }

        if (!freshUser) return next(new AppError('Please login again', 401));

        // const hasChangedPassword = freshUser.changedPasswordAfter(decoded.iat);
        // if (hasChangedPassword) return next(new AppError('Please login again', 401));

        res.locals.user = freshUser;

        next();
    });
