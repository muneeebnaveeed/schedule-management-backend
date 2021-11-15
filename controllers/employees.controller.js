const mongoose = require('mongoose');
const _ = require('lodash');
const Model = require('../models/employees.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;

    const results = await Model.paginate(
        {
            $and: [
                {
                    $or: [
                        { name: { $regex: `${search}`, $options: 'i' } },
                        { phone: { $regex: `${search}`, $options: 'i' } },
                        { idcard: { $regex: `${search}`, $options: 'i' } },
                        { email: { $regex: `${search}`, $options: 'i' } },
                        { description: { $regex: `${search}`, $options: 'i' } },
                    ],
                },
                { createdShop: res.locals.shop._id },
            ],
        },
        {
            projection: { __v: 0 },
            lean: true,
            populate: { path: 'createdShop', select: '_id address' },
            page,
            limit,
            sort,
        }
    );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.addMany = catchAsync(async function (req, res, next) {
    const docs = req.body;

    if (!docs || !docs.length) return next(new AppError('Please enter valid employees', 400));

    await Model.insertMany(docs);

    res.status(200).json();
});

module.exports.addOne = catchAsync(async function (req, res, next) {
    const newDoc = _.pick(req.body, ['name', 'phone', 'idcard', 'email', 'description', 'salary', 'hireDate']);
    await Model.create({ ...newDoc, createdShop: res.locals.shop._id });
    res.status(200).send();
});

module.exports.edit = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid id', 400));

    const newDoc = _.pick(req.body, ['name', 'phone', 'idcard', 'email', 'description', 'salary', 'hireDate']);

    if (!Object.keys(newDoc).length) return next(new AppError('Please enter a valid employee', 400));

    await Model.updateOne({ _id: id }, { ...newDoc, createdShop: res.locals.shop._id }, { runValidators: true });

    res.status(200).json();
});

module.exports.remove = catchAsync(async function (req, res, next) {
    let ids = req.params.id.split(',');

    for (const id of ids) {
        if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));
    }

    ids = ids.map((id) => mongoose.Types.ObjectId(id));

    await Model.deleteMany({ _id: { $in: ids } });

    res.status(200).json();
});
