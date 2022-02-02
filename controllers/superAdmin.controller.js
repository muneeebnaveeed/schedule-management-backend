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
const AdminUser = require('../models/adminUsers.model');
const User = require('../models/users.model');
const Location = require('../models/locations.model');
const LoggedHour = require('../models/loggedHours.model');
const Schedule = require('../models/schedules.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.addAdmin = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email', 'name', 'password', 'passwordConfirm', 'maxNoOfManagers', 'maxNoOfEmployees'])
    if (Object.keys(body).length < 6) return next(new AppError('Please enter a valid admin', 400));

    const createdAdmin = await AdminUser.create(body)

    return res.status(200).send(_.omit(createdAdmin, ['password', '__v']));
});

module.exports.editAdmin = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email', 'name', 'maxNoOfManagers', 'maxNoOfEmployees'])
    if (Object.keys(body).length < 4) return next(new AppError('Please enter a valid admin', 400));

    const updatedAdmin = await AdminUser.findByIdAndUpdate(req.params.adminId, body)

    return res.status(200).send(_.omit(updatedAdmin, ['password', '__v']));
});

module.exports.getAdmins = catchAsync(async function (req, res, next) {
    const { page, limit, sort = { _id: 1 }, search } = req.query;

    const results = await AdminUser.paginate(
        {
            $or: [
                { email: { $regex: `${search}`, $options: 'i' } },
            ],
        },
        {
            projection: { __v: 0, password: 0 },
            lean: true,
            page,
            limit,
            sort,
        }
    );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.removeAdmins = catchAsync(async function (req, res, next) {
    let ids = req.params.adminIds.split(',');

    for (const id of ids) {
        if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));
    }

    ids = ids.map((id) => mongoose.Types.ObjectId(id));

    const users = await User.find({ admin: { $in: ids } }, '_id')
    const userIds = users.map(user => user._id)

    await Promise.all([AdminUser.deleteMany({ _id: { $in: ids } }), User.deleteMany({ admin: { $in: ids } }), Location.deleteMany({ admin: { $in: ids } }), LoggedHour.deleteMany({ employee: { $in: userIds } }), Schedule.deleteMany({ admin: { $in: ids } })]);

    res.status(200).json();
});