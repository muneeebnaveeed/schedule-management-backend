const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const requestIp = require('request-ip');
const GeoPoint = require('geopoint');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
const { signToken } = require('../utils/jwt');
const User = require('../models/users.model');
const Schedule = require('../models/schedules.model');
const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');
const getLastCharacters = require('../utils/getLastCharacters');
const { Parser } = require('json2csv');
const excel = require('node-excel-export');

const getCurrentDaysArray = (date) => {
    const daysInMonth = dayjs(date).daysInMonth();

    const daysArray = [];

    for (let i = 0; i < daysInMonth; i++) {
        daysArray.push(i + 1);
    }

    return daysArray;
};

const convertDayOfMonthToDayOfWeek = (dayOfMonth, monthDate) => {
    const month = dayjs(monthDate).utc().format('MM');
    const year = dayjs(monthDate).utc().format('YYYY');
    const day = dayOfMonth.toString().length > 1 ? dayOfMonth.toString() : '0' + dayOfMonth;
    const date = dayjs(`${year}-${month}-${day}`).set('hours', 5.5).toDate();
    const dayOfWeek = dayjs(date).utc().format('dddd');

    return dayOfWeek;
};

// return <>{condition ? <FirstComponent /> : <SecondComponent />}</>

module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email', 'password']);
    if (Object.keys(body).length < 2) return next(new AppError('Please enter email and password', 400));

    const user = await mongoose
        .model('User')
        .findOne(
            { email: body.email, role: 'EMPLOYEE' },
            'name email password isConfirmed isPasswordSet location schedule'
        )
        .populate({ path: 'manager', select: 'name' })
        .populate({ path: 'location', select: 'name coordinates' });

    if (!user) return next(new AppError('Invalid email or password', 401));
    const isValidPassword = await user.isValidPassword(body.password, user.password);

    if (!isValidPassword) return next(new AppError('Invalid email or password', 401));
    if (!user.isConfirmed || !user.schedule) return next(new AppError('Your Access is pending', 403));

    const token = signToken({ id: user._id });

    const filteredUser = _.pick(user, ['_id', 'name', 'email', 'isPasswordSet', 'manager', 'location']);

    const monthlyLog = await LoggedHour.findOne({
        month: dayjs().utc().format('M-YYYY'),
        employee: user._id,
    });
    const currentPunchMode = getCurrentPunchMode(monthlyLog);
    const lastTime = _.pick(monthlyLog, ['lastIn', 'lastOut']);

    res.status(200).json({
        token,
        ...filteredUser,
        currentPunchMode,
        ...lastTime,
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
        {
            projection: { __v: 0, password: 0 },
            lean: true,
            page,
            limit,
            sort: { isConfirmed: 1, ...sort },
        }
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

const getCurrentPunchMode = (monthlyLog) => {
    const lastTime = _.pick(monthlyLog, ['lastIn', 'lastOut']);
    const punchModes = ['start', 'stop'];
    let currentPunchMode = punchModes[0];

    if (!lastTime.lastIn && !lastTime.lastOut) {
        return punchModes[0];
    }
    if (!lastTime.lastOut) {
        return punchModes[1];
    }
    if (!lastTime.lastOut && lastTime.lastIn) {
        currentPunchMode = punchModes[1];
        return currentPunchMode;
    }

    const timeDiff = dayjs(lastTime.lastOut).diff(dayjs(lastTime.lastIn).utc());
    currentPunchMode = timeDiff > 0 ? punchModes[0] : punchModes[1];
    return currentPunchMode;
};

module.exports.startTracking = catchAsync(async function (req, res, next) {
    const bodyCoordinates = _.pick(req.body, ['lat', 'long']);
    const nowDate = dayjs(req.body.nowDate).utc().format();
    const bodyGeoPoint = new GeoPoint(bodyCoordinates.lat, bodyCoordinates.long);
    const { location, _id, schedule: scheduleId } = res.locals.user;
    if (!scheduleId) return next(new AppError(`No schedule assigned yet`, 403));
    const schedule = await Schedule.findById(scheduleId, 'title color shiftTimes').lean();
    const setLocationGeoPoint = new GeoPoint(location.coordinates.lat, location.coordinates.long);

    const distance = bodyGeoPoint.distanceTo(setLocationGeoPoint, true) * 1000; // distance in meters
    if (distance > location.radius)
        return next(new AppError(`You are ${(distance - location.radius).toFixed(2)} meters away from location.`, 403));
    const day = dayjs().utc().format('dddd');
    if (!schedule.shiftTimes.hasOwnProperty(day)) {
        return next(new AppError(`You are not scheduled for today`, 403));
    }
    const dayOfMonth = dayjs(nowDate).utc().format('YYYY-MM-DD');
    const nowTime = dayjs(nowDate).utc().format('h:mm A');

    let monthlyLog = await LoggedHour.findOne({
        month: dayjs().utc().format('M-YYYY'),
        employee: _id,
    });

    if (!monthlyLog) {
        monthlyLog = await LoggedHour.create({
            employee: _id,
            lastIn: nowDate,
            logs: { [dayOfMonth]: [{ in: nowDate, schedule }] },
        });
    } else if (monthlyLog) {
        let logOfDay = monthlyLog.logs[dayOfMonth];
        if (!logOfDay) {
            monthlyLog.logs[dayOfMonth] = [{}];
            logOfDay = [{}];
        }
        if (logOfDay[0].hasOwnProperty('in') && logOfDay[0].hasOwnProperty('out')) {
            return next(new AppError(`You cannot start tracking today`, 403));
        }
        if (!logOfDay) {
            monthlyLog.lastIn = nowDate;
            monthlyLog.logs[dayOfMonth] = { [dayOfMonth]: [{ in: nowDate, schedule }] };
        } else if (logOfDay) {
            let flag = true;
            for (let index = 0; index < logOfDay.length; index++) {
                flag =
                    (logOfDay[index].hasOwnProperty('in') && logOfDay[index].hasOwnProperty('out')) ||
                    !logOfDay[index].hasOwnProperty('in');

                if (flag == false) break;
            }
            if (flag == true) {
                monthlyLog.logs[dayOfMonth].push({ in: nowDate, schedule });
                monthlyLog.lastIn = nowDate;
            }
        }
    }

    monthlyLog.markModified('logs');
    const savedLog = await monthlyLog.save();

    const lastTime = _.pick(savedLog, ['lastIn', 'lastOut']);

    res.status(200).send({ ...lastTime, currentPunchMode: 'stop' });
});

module.exports.stopTracking = catchAsync(async function (req, res, next) {
    const bodyCoordinates = _.pick(req.body, ['lat', 'long']);
    const nowDate = dayjs(req.body.nowDate).utc().format();

    const bodyGeoPoint = new GeoPoint(bodyCoordinates.lat, bodyCoordinates.long);

    const { location, _id } = res.locals.user;
    const setLocationGeoPoint = new GeoPoint(location.coordinates.lat, location.coordinates.long);

    const distance = bodyGeoPoint.distanceTo(setLocationGeoPoint, true) * 1000; // distance in meters

    if (distance > location.radius)
        return next(new AppError(`You are ${(distance - location.radius).toFixed(2)} meters away from location.`, 403));

    const dayOfMonth = dayjs(nowDate).utc().format('YYYY-MM-DD');

    const nowTime = dayjs(nowDate).utc().format('h:mm A');
    const monthlyLog = await LoggedHour.findOne({
        month: dayjs().utc().format('M-YYYY'),
        employee: _id,
    });
    if (!monthlyLog) {
        return next(new AppError('You first need to start track', 403));
    }
    const { lastIn, logs } = monthlyLog;
    if (logs.hasOwnProperty(dayOfMonth)) {
        for (let index = 0; index < logs[dayOfMonth].length; index++) {
            if (!logs[dayOfMonth][index].hasOwnProperty('out')) {
                logs[dayOfMonth][index] = { ...logs[dayOfMonth][index], out: nowDate };
                await monthlyLog.updateOne({
                    lastOut: nowDate,
                    logs,
                });
                await monthlyLog.save();
                break;
            }
        }
    } else {
        return next(new AppError('You first need to start track', 403));
    }

    const lastTime = _.pick(monthlyLog, ['lastIn', 'lastOut']);

    res.status(200).send({ ...lastTime, currentPunchMode: 'start' });
});

module.exports.getLastTracking = catchAsync(async function (req, res, next) {
    const { _id } = res.locals.user;
    const monthlyLog = await LoggedHour.findOne({
        month: dayjs().utc().format('M-YYYY'),
        employee: _id,
    });
    const currentPunchMode = getCurrentPunchMode(monthlyLog);
    const lastTime = _.pick(monthlyLog, ['lastIn', 'lastOut']);

    return res.status(200).send({ ...lastTime, currentPunchMode });
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
