const mongoose = require('mongoose');
const _ = require('lodash');
const Model = require('../models/locations.model');
const User = require('../models/users.model');

const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;
    const results = await Model.paginate(
        {
            name: { $regex: `${search}`, $options: 'i' },
            admin: res.locals.user._id,
        },
        {
            projection: { __v: 0, admin: 0 },
            lean: true,
            page,
            limit,
            sort,
            populate: [],
        }
    );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.getAllByManager = catchAsync(async function (req, res, next) {
    const assignedEmployees = await User.find({ role: 'EMPLOYEE', manager: res.locals.user._id }, 'location')
        .populate({ path: 'location', select: 'name _id' })
        .lean();

    const locationIds = [...new Set(assignedEmployees.map((e) => e.location?._id.toString()))];

    const locations = [];

    locationIds.forEach((id) => {
        let employee = assignedEmployees.find((employee) => employee.location?._id.toString() === id.toString());
        if (employee) locations.push(employee.location);
    });

    res.status(200).json(locations);
});

module.exports.getOne = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) return next(new AppError('Invalid location id', 400));

    const doc = await Model.findById(id, { __v: 0, admin: 0 }).lean();

    if (!doc) return next(new AppError('Location does not exist', 404));

    res.status(200).json(doc);
});

module.exports.addOne = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['name', 'coordinates', 'radius']);
    const location = await Model.create({ ...body, admin: res.locals.user._id });
    res.status(200).send(location);
});

module.exports.edit = catchAsync(async function (req, res, next) {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid id', 400));

    const newDoc = _.pick(req.body, ['name', 'coordinates', 'radius']);

    const loction = await Model.findOneAndUpdate(
        { _id: id, admin: mongoose.Types.ObjectId(res.locals.user._id) },
        { $set: newDoc },
        { new: true, select: '-admin -__v' }
    );

    res.status(200).json(loction);
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
