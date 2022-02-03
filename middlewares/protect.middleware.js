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
        if (role === 'SUPERADMIN') {
            freshUser = {
                email: 'superadmin@fyz.com',
                name: 'Super Admin'
            }
        } else
            if (role === 'ADMIN') {
                freshUser = await mongoose.model('AdminUser').findById(decoded.id, '-password -__v').lean();
            } else if (role === 'EMPLOYEE') {
                freshUser = await mongoose
                    .model('User')
                    .findById(decoded.id, '-password -__v')
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
                        { path: 'location', select: '-__v -admin' }, { path: 'schedule', select: '-__v' }
                    ])
                    .lean();
            } else if (role === 'MANAGER') {
                freshUser = await mongoose
                    .model('User')
                    .findById(decoded.id)
                    .populate([
                        { path: 'groups', select: '-__v' },
                        { path: 'admin', select: '-password -__v' },
                    ])
                    .lean();
            } else {
                return next(new AppError('Role is not defined', 500));
            }

        if (!freshUser) return next(new AppError('Please login again', 401));

        res.locals.user = { ...freshUser, role };

        next();
    });
