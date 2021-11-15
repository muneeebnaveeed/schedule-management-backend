/* eslint-disable prefer-const */
const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const dayjs = require('dayjs');
const localizedFormat = require('dayjs/plugin/localizedFormat');

dayjs.extend(localizedFormat);
const _ = require('lodash');
const { ObjectId } = require('mongoose').Types;
const Model = require('../models/salariesExpenses.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.getSalariesbyEmployeee = catchAsync(async function (req, res, next) {
    const { employeeId, page, limit, sort, search, startDate, endDate } = req.query;

    const result = await Model.paginate(
        {
            employeeId: ObjectId(employeeId),
            createdAt: { $gte: startDate, $lte: endDate },
            createdShop: res.locals.shop._id,
            description: { $regex: `${search}`, $options: 'i' },
        },
        {
            projection: { __v: 0, employeeId: 0, createdShop: 0 },
            lean: true,
            page,
            limit,
            sort,
        }
    );

    res.status(200).send(result);
});
module.exports.getSalariesbyEmployeeeCSV = catchAsync(async function (req, res, next) {
    const { employeeId, page, limit, sort, search, startDate, endDate } = req.query;

    const result = await Model.paginate(
        {
            employeeId: ObjectId(employeeId),
            createdAt: { $gte: startDate, $lte: endDate },
            createdShop: res.locals.shop._id,
            description: { $regex: `${search}`, $options: 'i' },
        },
        {
            projection: { __v: 0, employeeId: 0, createdShop: 0 },
            lean: true,
            page,
            limit,
            sort,
        }
    );
    const { name } = await mongoose.model('Employee').findOne({ _id: employeeId }, 'name');
    const json2csv = new Parser({ fields: ['amount', 'description', 'createdAt'] });
    const csv = json2csv.parse(result.docs);
    res.attachment(
        `Salaries Expenses- ${name} - ${dayjs(startDate).format('DD-MM-YYYY')} -- ${dayjs(endDate).format(
            'DD-MM-YYYY'
        )}.csv`
    );
    res.status(200).send(csv);
});

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search, startDate, endDate } = req.query;

    const results = await Model.paginate(
        {
            createdAt: { $gte: startDate, $lte: endDate },
            createdShop: res.locals.shop._id,
            description: { $regex: `${search}`, $options: 'i' },
        },
        {
            projection: { __v: 0 },
            populate: [
                { path: 'employeeId', select: '_id name' },
                { path: 'createdShop', select: '_id address' },
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
module.exports.getAllCSV = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search, startDate, endDate } = req.query;

    const results = await Model.paginate(
        {
            createdAt: { $gte: startDate, $lte: endDate },
            createdShop: res.locals.shop._id,
            description: { $regex: `${search}`, $options: 'i' },
        },
        {
            projection: { __v: 0, createdShop: 0 },
            populate: [{ path: 'employeeId', select: 'name' }],
            lean: true,
            page,
            limit,
            sort,
        }
    );
    const docs = results.docs.map((e) => ({
        Date: dayjs(e.createdAt).format('lll'),
        Description: e.description,
        Amount: e.amount,
        Employee: e.employeeId.name,
    }));
    const json2csv = new Parser({ fields: ['Employee', 'Amount', 'Description', 'Date'] });
    const csv = json2csv.parse(docs);
    res.attachment(
        `Salaries Expenses ${dayjs(startDate).format('DD-MM-YYYY')} -- ${dayjs(endDate).format('DD-MM-YYYY')}.csv`
    );
    res.status(200).send(csv);
});

module.exports.addOne = catchAsync(async function (req, res, next) {
    const newDoc = _.pick(req.body, ['employeeId', 'description', 'amount']);
    await Model.create({ ...newDoc, createdShop: res.locals.shop._id });
    res.status(200).send();
});

module.exports.edit = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid id', 400));

    const newDoc = _.pick(req.body, ['employeeId', 'description', 'amount']);

    if (!Object.keys(newDoc).length) return next(new AppError('Please enter a valid expense', 400));

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
