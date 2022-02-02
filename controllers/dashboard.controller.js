const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');

const validator = require('email-validator');
const fs = require('file-system');
const csv = require('csvtojson');
const path = require('path');
const { signToken } = require('../utils/jwt');
const User = require('../models/users.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.getDashboard = catchAsync(async function (req, res, next) {
    const { _id: adminId } = res.locals.user
    const [noOfManagers, noOfEmployees] = await Promise.all([User.find({ admin: adminId, role: 'MANAGER' }).count(), User.find({ admin: adminId, role: 'EMPLOYEE' }).count()])

    return res.status(200).json({ noOfManagers, noOfEmployees });
});