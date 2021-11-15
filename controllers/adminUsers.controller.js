const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { signToken } = require('../utils/jwt');
const Model = require('../models/adminUsers.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.registerUser = catchAsync(async function (req, res, next) {
    const newUser = _.pick(req.body, ['name', 'username', 'password', 'passwordConfirm']);
    await Model.create(newUser);
    res.status(200).json();
});

module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['username', 'password']);

    if (Object.keys(body).length < 2) return next(new AppError('Please enter username and password', 400));

    const user = await Model.findOne({ username: body.username });

    if (!user) return next(new AppError('Invalid username or password', 401));

    const isValidPassword = await user.isValidPassword(body.password, user.password);

    if (!isValidPassword) return next(new AppError('Invalid username or password', 401));

    const token = signToken(user._id);

    const filteredUser = _.pick(user, ['_id', 'name', 'username']);

    res.status(200).json({
        token,
        ...filteredUser,
    });
});
