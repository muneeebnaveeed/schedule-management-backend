const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const dayjs = require('dayjs');
const localizedFormat = require('dayjs/plugin/localizedFormat');

dayjs.extend(localizedFormat);
const _ = require('lodash');
const Model = require('../models/vipCustomers.model');
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
                    ],
                },
                {
                    createdShop: res.locals.shop._id,
                },
            ],
        },
        {
            projection: { __v: 0 },
            populate: { path: 'createdShop', select: '_id address' },
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
    const { page, limit, sort, search } = req.query;

    const results = await Model.paginate(
        {
            $and: [
                {
                    $or: [
                        { name: { $regex: `${search}`, $options: 'i' } },
                        { phone: { $regex: `${search}`, $options: 'i' } },
                    ],
                },
                {
                    createdShop: res.locals.shop._id,
                },
            ],
        },
        {
            projection: { __v: 0 },
            populate: { path: 'createdShop', select: '_id address' },
            lean: true,
            page,
            limit,
            sort,
        }
    );
    const docs = results.docs.map((e) => ({
        Name: e.name,
        'Phone No': e.phone,
        'VIP Balance': e.balance,
        Date: dayjs(e.createdAt).format('lll'),
    }));
    const json2csv = new Parser({ fields: ['Name', 'Phone No', 'VIP Balance', 'Date'] });
    const csv = json2csv.parse(docs);
    res.attachment(`VIP Customers ${dayjs().format('DD-MM-YYYY')}.csv`);
    res.status(200).send(csv);
});

module.exports.addOne = catchAsync(async function (req, res, next) {
    const newDoc = _.pick(req.body, ['name', 'phone', 'balance']);
    await Model.create({ ...newDoc, createdShop: res.locals.shop._id });

    res.status(200).send();
});

module.exports.edit = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid id', 400));

    const newDoc = _.pick(req.body, ['name', 'phone', 'balance']);

    if (!Object.keys(newDoc).length) return next(new AppError('Please enter a valid customer', 400));

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
