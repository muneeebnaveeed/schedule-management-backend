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
const Model = require('../models/adminUsers.model');
const User = require('../models/users.model');
const Tag = require('../models/tag.model');

const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort = { _id: 1 }, search, filters } = req.query;

    const results = await mongoose.model('User').paginate(
        {
            $and: [
                {
                    $or: [
                        { name: { $regex: `${search}`, $options: 'i' } },
                        { email: { $regex: `${search}`, $options: 'i' } },
                    ],
                },
                {
                    role: { $in: filters },
                    admin: res.locals.user.admin?._id || res.locals.user._id,
                },
            ],
        },
        {
            projection: { __v: 0, password: 0 },
            populate: [
                { path: 'manager', select: '_id email name' },
                { path: 'location', select: '_id name' },
            ],
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

module.exports.remove = catchAsync(async function (req, res, next) {
    let ids = req.params.id.split(',');

    for (const id of ids) {
        if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));
    }

    ids = ids.map((id) => mongoose.Types.ObjectId(id));

    await mongoose.model('User').deleteMany({ _id: { $in: ids } });

    res.status(200).json();
});

module.exports.getAllTagsAndUntaggedUsers = catchAsync(async function (req, res, next) {
    const employees = await mongoose
        .model('User')
        .find(
            {
                role: 'EMPLOYEE',
                manager: res.locals.user._id,
                admin: res.locals.user.admin?._id,
            },
            '_id email tags'
        )
        .lean();

    const taggedEmployees = employees.filter((e) => e.tags.length > 0);
    const unTaggedEmployees = employees.filter((e) => e.tags.length <= 0);

    const tagIds = [];
    taggedEmployees.map((e) => e.tags.map((id) => tagIds.push(id.toString())));

    const tags = await Tag.find({ _id: { $in: tagIds } }).lean();

    tags.forEach((tag, index) => {
        const correspondingEmployees = taggedEmployees.map((e) => {
            if (e.tags.map((e) => e.toString()).includes(tag._id.toString())) return e._id;
        });
        tags[index].employees = correspondingEmployees;
    });

    res.status(200).json([...tags, ...unTaggedEmployees]);
});
