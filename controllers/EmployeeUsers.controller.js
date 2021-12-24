const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const requestIp = require('request-ip');
const GeoPoint = require('geopoint');
const dayjs = require('dayjs');
const { signToken } = require('../utils/jwt');
const User = require('../models/users.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email', 'password']);
    if (Object.keys(body).length < 2) return next(new AppError('Please enter email and password', 400));

    const user = await mongoose
        .model('User')
        .findOne({ email: body.email }, 'name email password isConfirmed isPasswordSet')
        .populate({ path: 'manager', select: 'name' });
    if (!user) return next(new AppError('Invalid email or password', 401));
    const isValidPassword = await user.isValidPassword(body.password, user.password);

    if (!isValidPassword) return next(new AppError('Invalid email or password', 401));
    if (!user.isConfirmed) return next(new AppError('Your Access is pending', 403));
    const token = signToken({ id: user._id });

    const filteredUser = _.pick(user, ['_id', 'name', 'email', 'isPasswordSet', 'manager']);

    res.status(200).json({
        token,
        ...filteredUser,
    });
});

module.exports.getAll = catchAsync(async function (req, res, next) {
    const { page, limit, sort, search } = req.query;

    const results = await User.paginate(
        {
            $or: [
                { name: { $regex: `${search}`, $options: 'i' } },
                { username: { $regex: `${search}`, $options: 'i' } },
            ],
        },
        { projection: { __v: 0, password: 0 }, lean: true, page, limit, sort: { isConfirmed: 1, ...sort } }
    );

    res.status(200).json(
        _.pick(results, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter'])
    );
});

module.exports.getOne = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) return next(new AppError('Invalid employee id', 400));

    const doc = await User.findById(id, { __v: 0 }).lean();

    if (!doc) return next(new AppError('Employee does not exist', 404));

    res.status(200).json(doc);
});

// module.exports.register = catchAsync(async function (req, res, next) {
//     const newUser = _.pick(req.body, ['name', 'username', 'password', 'passwordConfirm']);
//     if (!Object.keys(newUser).length) return next(new AppError('Please enter a valid user', 400));
//     await Model.create(newUser);

//     res.status(200).json();
// });

module.exports.inviteEmployee = catchAsync(async function (req, res, next) {
    const newUser = _.pick(req.body, ['username', 'name']);

    await Model.create(newUser);

    res.status(200).json();
});

module.exports.setPassword = catchAsync(async function (req, res, next) {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) return next(new AppError('Please enter a valid employee id', 400));

    const user = await mongoose.model('User').findById(id);

    if (!user) return next(new AppError('Employee does not exist', 404));

    user.password = req.body.password;
    user.isPasswordSet = true;
    await user.save();

    res.status(200).send();
});

module.exports.assignManager = catchAsync(async function (req, res, next) {
    const { employeeid } = req.params;
    const { managerid } = req.body;

    if (!employeeid || !mongoose.isValidObjectId(employeeid))
        return next(new AppError('Please enter a valid employee id', 400));

    if (!managerid || !mongoose.isValidObjectId(managerid))
        return next(new AppError('Please enter a valid manager id', 400));

    const [user, manager] = await Promise.all([
        Model.findById(employeeid),
        mongoose.model('ManagerUsers').findById(managerid),
    ]);

    if (!user) return next(new AppError('Employee does not exist', 404));
    if (!manager) return next(new AppError('Manager does not exist', 404));

    user.manager = managerid;
    await user.save();

    res.status(200).send();
});

module.exports.assignSchedule = catchAsync(async function (req, res, next) {
    const { employeeid } = req.params;
    const { scheduleid } = req.body;

    if (!employeeid || !mongoose.isValidObjectId(employeeid))
        return next(new AppError('Please enter a valid employee id', 400));

    if (!scheduleid || !mongoose.isValidObjectId(scheduleid))
        return next(new AppError('Please enter a valid schedule id', 400));

    const [user, schedule] = await Promise.all([
        Model.findById(employeeid),
        mongoose.model('Schedule').findById(scheduleid),
    ]);

    if (!user) return next(new AppError('Employee does not exist', 404));
    if (!schedule) return next(new AppError('Manager does not exist', 404));

    user.schedule = scheduleid;
    await user.save();

    res.status(200).send();
});

const LoggedHour = require('../models/loggedHours.model');

module.exports.startTracking = catchAsync(async function (req, res, next) {
    const bodyCoordinates = _.pick(req.body.coordinates, ['lat', 'long']);

    const bodyGeoPoint = new GeoPoint(bodyCoordinates.lat, bodyCoordinates.long);
    const { location, _id } = res.locals.user;
    const setLocationGeoPoint = new GeoPoint(location.coordinates.lat, location.coordinates.long);

    const distance = bodyGeoPoint.distanceTo(setLocationGeoPoint, true) * 1000; // distance in meters
    if (distance > location.radius)
        return next(new AppError(`You are ${(distance - location.radius).toFixed(2)} meters away from location.`, 403));
    const nowDate = Date.now();
    const dayOfMonth = dayjs().format('D');

    let monthlyLog = await LoggedHour.findOne({ month: dayjs().format('M-YYYY'), employee: _id });

    if (!monthlyLog) {
        monthlyLog = await LoggedHour.create({
            employee: _id,
            lastIn: nowDate,
            logs: { [dayOfMonth]: [{ in: nowDate }] },
        });
    } else if (monthlyLog) {
        const logOfDay = monthlyLog.logs[dayOfMonth];
        if (!logOfDay) {
            await monthlyLog.updateOne({
                lastIn: nowDate,
                'logs.[dayOfMonth]': { [dayOfMonth]: [{ in: nowDate }] },
            });
        } else if (logOfDay) {
            let flag = true
            for (let index = 0; index < logOfDay.length; index++) {
                flag = logOfDay[index].hasOwnProperty('in') && logOfDay[index].hasOwnProperty('out')
                if (flag == false) break
            }
            if (flag == true) {
                logOfDay.push({ 'in': nowDate })
                await monthlyLog.updateOne({ lastIn: nowDate, logs: { ...monthlyLog.logs } })
            }
        }
    }
    await monthlyLog.save();
    const response = _.pick(monthlyLog, ['lastIn', 'lastOut'])
    res.status(200).send(response);
});

module.exports.stopTracking = catchAsync(async function (req, res, next) {
    const bodyCoordinates = _.pick(req.body.coordinates, ['lat', 'long']);
    const bodyGeoPoint = new GeoPoint(bodyCoordinates.lat, bodyCoordinates.long);
    const { location, _id } = res.locals.user;
    const setLocationGeoPoint = new GeoPoint(location.coordinates.lat, location.coordinates.long);

    const distance = bodyGeoPoint.distanceTo(setLocationGeoPoint, true) * 1000; // distance in meters
    if (distance > location.radius)
        return next(new AppError(`You are ${(distance - location.radius).toFixed(2)} meters away from location.`, 403));
    const nowDate = Date.now();
    const dayOfMonth = dayjs().format('D');
    // const dayOfMonth = 20;
    const monthlyLog = await LoggedHour.findOne({ month: dayjs().format('M-YYYY'), employee: _id });
    if (!monthlyLog) {
        return next(new AppError('You first need to start track', 403));
    }
    const { lastIn, logs } = monthlyLog;

    for (let index = 0; index < logs[dayOfMonth].length; index++) {
        if (!logs[dayOfMonth][index].hasOwnProperty('out')) {
            logs[dayOfMonth][index] = { ...logs[dayOfMonth][index], out: nowDate }
            await monthlyLog.updateOne({
                lastOut: nowDate,
                logs
            })
            await monthlyLog.save()
            break
        }
    }
    const response = _.pick(monthlyLog, ['lastIn', 'lastOut'])
    res.status(200).send(response);
});

module.exports.getLastTracking = catchAsync(async function (req, res, next) {
    const { _id } = res.locals.user;
    const monthlyLog = await LoggedHour.findOne({ month: dayjs().format('M-YYYY'), employee: _id });
    const response = _.pick(monthlyLog, ['lastIn', 'lastOut'])
    res.status(200).send(response);
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

module.exports.getTimeSheet = catchAsync(async function (req, res, next) {
    const { startDate, endDate } = req.query;

    const dateDiff = Math.ceil((dayjs(endDate).endOf('M')).diff((dayjs(startDate).startOf('M')), 'M', true))

    let months = []
    for (let index = 0; index < Number(dateDiff); index++) {
        months.push(dayjs(startDate).add(index, 'M').format('M-YYYY'))
    }

    let loggedHours = await LoggedHour.find({ month: { $in: months }, employee: res.locals.user._id }, 'month logs')
    const startingMonthDay = Number(dayjs(startDate).format('D'))
    const endingMonthDay = Number(dayjs(endDate).format('D'))

    for (let i = 0; i < loggedHours.length; i++) {
        if (loggedHours[i].month == months[0]) {
            for (let j = 1; j < startingMonthDay; j++) {
                if (loggedHours[i].logs.hasOwnProperty(j)) {
                    delete loggedHours[i].logs[j]
                }
            }
        }
        if (loggedHours[i].month == months[months.length - 1]) {
            for (let j = endingMonthDay; j <= 31; j++) {
                delete loggedHours[i].logs[j]
            }
        }
    }

    // let logs = []
    // for (let i = 0; i < employeeIds.length; i++) {
    //     logs.push({ [employeeIds[i]]: loggedHours.filter(e => e.employee.toString() === employeeIds[i].toString()) })
    // }

    res.status(200).send({ loggedHours })
})