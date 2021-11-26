const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { signToken } = require('../utils/jwt');
const Model = require('../models/group.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.addOne = catchAsync(async function (req, res, next) {
    const doc = _.pick(req.body, ['name']);
    if (!Object.keys(doc).length) return next(new AppError('Please enter a valid group', 400));
    await Model.create(doc);

    res.status(200).json();
});

module.exports.getOne = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) return next(new AppError('Invalid id', 400));

    const doc = await Model.findById(id, { __v: 0 }).lean();

    if (!doc) return next(new AppError('Group does not exist', 404));

    res.status(200).json(doc);
});

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;

    const results = await Model.paginate(
        {
            name: { $regex: `${search}`, $options: 'i' },
        },
        { projection: { __v: 0 }, lean: true, page, limit, sort: { name: 1, ...sort } }
    );

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

    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid id', 400));

    const newDoc = _.pick(req.body, ['name']);

    if (!Object.keys(newDoc).length) return next(new AppError('Please enter a valid employee', 400));

    await Model.updateOne({ _id: id }, newDoc);

    res.status(200).json();
});
