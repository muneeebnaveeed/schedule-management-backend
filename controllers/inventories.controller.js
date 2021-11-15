const mongoose = require('mongoose');
const { Parser } = require('json2csv');
const dayjs = require('dayjs');
const _ = require('lodash');
const Model = require('../models/inventories.model');
const InventoryList = require('../models/inventoriesList.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, search } = req.query;

    const results = await InventoryList.paginate(
        {
            $or: [{ item: { $regex: `${search}`, $options: 'i' } }],
        },
        { projection: { __v: 0 }, lean: true, page, limit }
    );
    // const results = await Model.paginate(
    //     {
    //         $or: [
    //             { item: { $regex: `${search}`, $options: 'i' } },
    //             { description: { $regex: `${search}`, $options: 'i' } },
    //         ],
    //     },
    //     { projection: { __v: 0 }, lean: true, page, limit }
    // );
    // const docs = await Model.aggregatePaginate(
    //     Model.aggregate([
    //         {
    //             $match: {
    //                 item: { $regex: `${search}`, $options: 'i' },
    //             },
    //         },
    //         { $group: { _id: '$item', quantity: { $sum: '$quantity' } } },
    //         {
    //             $project: { item: '$_id', quantity: '$quantity', _id: 0 },
    //         },
    //     ]),
    //     {
    //         lean: true,
    //         page,
    //         limit,
    //     }
    // );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.getInventoryCSV = catchAsync(async function (req, res, next) {
    const { page, limit, search } = req.query;

    const docs = await InventoryList.paginate(
        {
            $or: [{ item: { $regex: `${search}`, $options: 'i' } }],
        },
        { projection: { __v: 0 }, lean: true, page, limit }
    );
    const json2csv = new Parser({ fields: ['item', 'quantity'] });
    const csv = json2csv.parse(docs.docs);
    const date = dayjs().format('DD-MM-YYYY');
    res.attachment(`Inventory ${date}.csv`);
    res.status(200).send(csv);
});

module.exports.getTransactions = catchAsync(async function (req, res, next) {
    const { page, limit, search, startDate, endDate } = req.query;
    const { type } = req.params;
    const quantityQuery = type === 'add' ? { $gt: 0 } : { $lte: 0 };

    const results = await Model.paginate(
        {
            createdAt: { $gte: startDate, $lte: endDate },
            createdShop: res.locals.shop._id,
            quantity: quantityQuery,
            $or: [
                { item: { $regex: `${search}`, $options: 'i' } },
                { description: { $regex: `${search}`, $options: 'i' } },
            ],
        },
        { projection: { __v: 0, createdShop: 0 }, lean: true, page, limit }
    );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.getTransactionsCSV = catchAsync(async function (req, res, next) {
    const { page, limit, search, startDate, endDate } = req.query;
    const { type } = req.params;
    const quantityQuery = type === 'add' ? { $gt: 0 } : { $lte: 0 };

    const results = await Model.paginate(
        {
            createdAt: { $gte: startDate, $lte: endDate },
            createdShop: res.locals.shop._id,
            quantity: quantityQuery,
            $or: [
                { item: { $regex: `${search}`, $options: 'i' } },
                { description: { $regex: `${search}`, $options: 'i' } },
            ],
        },
        { projection: { __v: 0, createdShop: 0 }, lean: true, page, limit }
    );

    const json2csv = new Parser({ fields: ['item', 'createdAt', 'quantity', 'description'] });
    const csv = json2csv.parse(results.docs);
    res.attachment(
        `Inventory Transactions ${dayjs(startDate).format('DD-MM-YYYY')} -- ${dayjs(endDate).format('DD-MM-YYYY')}.csv`
    );
    res.status(200).send(csv);
});

module.exports.addOne = catchAsync(async function (req, res, next) {
    const newDoc = _.pick(req.body, ['item', 'quantity', 'description']);

    await Model.create(newDoc);
    const inventoryItem = await InventoryList.findOne({ item: newDoc.item });
    const quantity = inventoryItem ? inventoryItem.quantity + newDoc.quantity : newDoc.quantity;

    if (quantity < 0) return next(new AppError('Quantity cannot be negative.', 400));

    if (inventoryItem) {
        inventoryItem.quantity = quantity;
        await inventoryItem.save();
    } else await InventoryList.create({ item: newDoc.item, quantity });

    res.status(200).send();
});

module.exports.edit = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid id', 400));

    const newDoc = _.pick(req.body, ['item', 'quantity', 'description']);

    if (!Object.keys(newDoc).length) return next(new AppError('Please enter a valid transaction', 400));

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
module.exports.removeInventory = catchAsync(async function (req, res, next) {
    let ids = req.params.id.split(',');

    for (const id of ids) {
        if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter valid id(s)', 400));
    }

    ids = ids.map((id) => mongoose.Types.ObjectId(id));

    await InventoryList.deleteMany({ _id: { $in: ids } });

    res.status(200).json();
});
