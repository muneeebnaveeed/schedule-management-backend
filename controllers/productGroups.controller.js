const mongoose = require('mongoose');
const _ = require('lodash');
const Model = require('../models/productGroups.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;

    const results = await Model.paginate(
        {
            $or: [{ name: { $regex: `${search}`, $options: 'i' } }],
        },
        { projection: { __v: 0 }, lean: true, page, limit, sort }
    );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.addOne = catchAsync(async function (req, res, next) {
    const newDoc = _.pick(req.body, ['name', 'color', 'description']);
    await Model.create(newDoc);
    res.status(200).send();
});

module.exports.edit = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));

    const newDoc = _.pick(req.body, ['name', 'color', 'description']);

    if (!Object.keys(newDoc).length) return next(new AppError('Please enter a valid product group', 400));
    console.log('Passed');

    await Model.updateOne({ _id: id }, newDoc, { new: true, context: 'query', runValidators: true });

    res.status(200).json();
});

module.exports.remove = catchAsync(async function (req, res, next) {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));
    await Promise.all([
        mongoose.model('Product').deleteMany({ registeredGroupId: mongoose.Types.ObjectId(id) }),
        Model.findByIdAndDelete(mongoose.Types.ObjectId(id)),
    ]);

    res.status(200).json();
});
