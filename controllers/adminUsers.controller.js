const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');

const validator = require('email-validator');
const fs = require('file-system');
const csv = require('csvtojson');
const { signToken } = require('../utils/jwt');
const Model = require('../models/adminUsers.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.registerUser = catchAsync(async function (req, res, next) {
    const newUser = _.pick(req.body, ['name', 'email', 'password', 'passwordConfirm']);
    await Model.create(newUser);
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
    const emails = req.params.emails.split(',');
    const { adminid } = req.params;

    const adminUser = await Model.findById(adminid).lean();
    if (!adminUser) return next(new AppError('User does not exist', 404));
    for (const email of emails) {
        if (!validator.validate(email)) return next(new AppError('One or more emails are invalid', 400));
    }
    for (const email of emails) {
        let ManagerUser = await mongoose.model('ManagerUser').findOne({ email }).lean();
        if (!ManagerUser) ManagerUser = await mongoose.model('ManagerUser').create({ email });
        const token = signToken({ adminid, managerid: ManagerUser._id });
        await sgMail.send({
            to: email, // Change to your recipient
            from: process.env.SENDGRID_SENDER_EMAIL, // Change to your verified sender
            subject: `Schedule Management App Invitation`,
            // text: 'and easy to do anywhere, even with Node.js',
            html: `<body> ${adminUser.name} invited you to be a manager of Schedule Management Application.
            <br/>Please follow the link to continue:
            <br/><br/>
            <a href="http://schedule-management.com/managers/accept?t=${token}"
            > Accept Invitation</a>
            </body > `,
        });
    }

    res.status(200).json();
});
module.exports.importEmployees = catchAsync(async function (req, res, next) {
    const employees = await csv().fromString(req.file.buffer.toString());
    for (const employee of employees) {
        await mongoose.model('EmployeeUser').create({ ...employee, passwordConfirm: employee.password });
    }
    res.status(200).json();
});
