const mongoose = require('mongoose');
const _ = require('lodash');
const { Model } = require('../models/products.model');
const ProductGroup = require('../models/productGroups.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;

    const results = await Model.paginate(
        {
            $or: [
                { name: { $regex: `${search}`, $options: 'i' } },
                { description: { $regex: `${search}`, $options: 'i' } },
            ],
        },
        {
            projection: { __v: 0 },
            populate: { path: 'registeredGroupId', select: '_id name color' },
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

module.exports.getbyGroups = catchAsync(async function (req, res, next) {
    const [results, productGroups] = await Promise.all([
        Model.aggregate([
            {
                $group: {
                    _id: '$registeredGroupId',

                    products: {
                        $push: {
                            _id: '$_id',
                            name: '$name',
                            salePrice: '$salePrice',
                            costPrice: '$costPrice',
                        },
                    },
                },
            },
            {
                $project: {
                    group: '$_id',
                    _id: 0,
                    products: '$products',
                },
            },
            {
                $sort: { group: 1 },
            },
        ]),
        mongoose.model('ProductGroup').find().lean(),
    ]);
    results.forEach((result) => {
        const found = productGroups.find((productGroup) => productGroup._id.toString() === result.group.toString());
        result.group = { _id: found._id, name: found.name, color: found.color };
    });

    res.status(200).json(results);
});

module.exports.addOne = catchAsync(async function (req, res, next) {
    const newDoc = _.pick(req.body, ['registeredGroupId', 'name', 'salePrice', 'costPrice', 'description']);

    if (Object.keys(newDoc).length < 4) return next(new AppError('Please enter a valid product', 400));

    const type = await ProductGroup.findById(newDoc.registeredGroupId, { title: 0, createdAt: 0, __v: 0 }).lean();

    if (!type) return next(new AppError('Type does not exist', 404));

    await Model.create(newDoc);

    res.status(200).send();
});

module.exports.edit = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid id', 400));

    const newDoc = _.pick(req.body, ['registeredGroupId', 'name', 'salePrice', 'costPrice', 'description']);

    if (!Object.keys(newDoc).length) return next(new AppError('Please enter a valid product', 400));

    const registeredGroup = await ProductGroup.findById(newDoc.registeredGroupId).lean();

    if (!registeredGroup) return next(new AppError('Registered Group does not exist', 404));

    await Model.updateOne({ _id: id }, newDoc, { runValidators: true });

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
