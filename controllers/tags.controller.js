const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { signToken } = require('../utils/jwt');
const Model = require('../models/tag.model');
const User = require('../models/users.model');

const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.addOne = catchAsync(async function (req, res, next) {
    const doc = _.pick(req.body, ['name', 'employees']);

    if (Object.keys(doc).length < 2) return next(new AppError('Please enter a valid group', 400));

    if (doc.employees.length < 1) return next(new AppError('Please assign employees to the tag', 400));

    const createdTag = await Model.create({ ...doc, manager: res.locals.user._id });

    await User.updateMany({ _id: { $in: doc.employees } }, { $push: { tags: createdTag._id } });

    res.status(200).json();
});

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;

    const results = await Model.paginate(
        {
            name: { $regex: `${search}`, $options: 'i' },
            manager: res.locals.user._id,
        },
        { projection: { __v: 0 }, lean: true, page, limit, sort: { name: 1, ...sort } }
    );

    const tagIds = results.docs.map((e) => e._id);
    const employees = await User.find({ role: 'EMPLOYEE', tags: { $in: tagIds } }, '_id tags').lean();

    tagIds.forEach((id, index) => {
        const correspondingEmployees = employees.map((e) => {
            if (e.tags.map((e) => e.toString()).includes(id.toString())) return e._id;
        });
        results.docs[index].employees = correspondingEmployees;
    });

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.remove = catchAsync(async function (req, res, next) {
    let ids = req.params.ids.split(',');

    for (const id of ids) {
        if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));
    }

    ids = ids.map((id) => mongoose.Types.ObjectId(id));

    await Model.deleteMany({ _id: { $in: ids } });

    res.status(200).json();
});

module.exports.edit = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    const doc = _.pick(req.body, ['name', 'employees']);

    if (Object.keys(doc).length < 2) return next(new AppError('Please enter a valid group', 400));

    if (doc.employees.length < 1) return next(new AppError('Please assign employees to the tag', 400));

    const tag = await Model.findById(id, '_id').lean();

    await User.updateMany({ _id: { $in: doc.employees } }, { $push: { tags: tag._id.toString() } });

    res.status(200).json();
});
