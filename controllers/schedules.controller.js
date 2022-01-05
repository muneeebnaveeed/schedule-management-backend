const mongoose = require('mongoose');
const _ = require('lodash');
const Model = require('../models/schedules.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');
const User = require('../models/users.model');
const dayjs = require('dayjs');

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort } = req.query;

    const results = await Model.paginate({}, { projection: { __v: 0 }, lean: true, page, limit, sort });

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.addOne = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
        'colorCode',
    ]);
    await Model.create(body);
    res.status(200).send();
});

module.exports.edit = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid id', 400));

    const body = _.pick(req.body, [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
        'colorCode',
    ]);

    await Model.findByIdAndUpdate(id, body, { runValidators: true });

    res.status(200).json();
});

module.exports.assignOpenSchedule = catchAsync(async function (req, res, next) {
    const { employeeId } = req.params;

    if (!mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid id', 400));

    const employee = await User.findById(employeeId);

    if (!employee) return next(new AppError('Employee does not exist', 404));

    const weeksStored = Object.values(employee.openSchedule);

    if (weeksStored.length > 4) {
        const firstWeek = weeksStored[0];
        delete employee.openSchedule[firstWeek];
    }

    const currentWeekStartDate = dayjs().startOf('week').toDate();

    employee.openSchedule = {
        ...employee.openSchedule,
        [currentWeekStartDate]: { ...employee.openSchedule[currentWeekStartDate], ...req.body },
    };

    await employee.save();

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
