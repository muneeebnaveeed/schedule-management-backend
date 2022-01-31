const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const requestIp = require('request-ip');
const GeoPoint = require('geopoint');
const dayjs = require('dayjs');
const { signToken } = require('../utils/jwt');
const User = require('../models/users.model');
const Schedule = require('../models/schedules.model')
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
    const month = dayjs(monthDate).format('MM');
    const year = dayjs(monthDate).format('YYYY');
    const day = dayOfMonth.toString().length > 1 ? dayOfMonth.toString() : '0' + dayOfMonth;
    const date = dayjs(`${year}-${month}-${day}`).set('hours', 5.5).toDate();
    const dayOfWeek = dayjs(date).format('dddd');

    return dayOfWeek;
};

// return <>{condition ? <FirstComponent /> : <SecondComponent />}</>

module.exports.loginUser = catchAsync(async function (req, res, next) {
    const body = _.pick(req.body, ['email', 'password']);
    if (Object.keys(body).length < 2) return next(new AppError('Please enter email and password', 400));

    const user = await mongoose
        .model('User')
        .findOne({ email: body.email }, 'name email password isConfirmed isPasswordSet location')
        .populate({ path: 'manager', select: 'name' })
        .populate({ path: 'location', select: 'name coordinates' });

    if (!user) return next(new AppError('Invalid email or password', 401));
    const isValidPassword = await user.isValidPassword(body.password, user.password);

    if (!isValidPassword) return next(new AppError('Invalid email or password', 401));
    if (!user.isConfirmed) return next(new AppError('Your Access is pending', 403));
    const token = signToken({ id: user._id });

    const filteredUser = _.pick(user, ['_id', 'name', 'email', 'isPasswordSet', 'manager', 'location']);

    const monthlyLog = await LoggedHour.findOne({
        month: dayjs().format('M-YYYY'),
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
        return punchModes[0]
    }
    if (!lastTime.lastOut) {
        return punchModes[1];
    }
    if (!lastTime.lastOut && lastTime.lastIn) {
        currentPunchMode = punchModes[1];
        return currentPunchMode;
    }

    const timeDiff = dayjs(lastTime.lastOut).diff(dayjs(lastTime.lastIn));
    currentPunchMode = timeDiff > 0 ? punchModes[0] : punchModes[1];
    return currentPunchMode;
};

module.exports.startTracking = catchAsync(async function (req, res, next) {
    const bodyCoordinates = _.pick(req.body, ['lat', 'long']);

    const bodyGeoPoint = new GeoPoint(bodyCoordinates.lat, bodyCoordinates.long);
    const { location, _id, schedule: scheduleId } = res.locals.user;
    if (!scheduleId)
        return next(new AppError(`No schedule assigned yet`, 403));
    const schedule = await Schedule.findById(scheduleId, 'title color')

    const setLocationGeoPoint = new GeoPoint(location.coordinates.lat, location.coordinates.long);

    const distance = bodyGeoPoint.distanceTo(setLocationGeoPoint, true) * 1000; // distance in meters
    if (distance > location.radius)
        return next(new AppError(`You are ${(distance - location.radius).toFixed(2)} meters away from location.`, 403));
    const nowDate = new Date();
    const dayOfMonth = dayjs(nowDate).format('YYYY-MM-DD');
    const nowTime = dayjs(nowDate).format('h:mm A');

    let monthlyLog = await LoggedHour.findOne({
        month: dayjs().format('M-YYYY'),
        employee: _id,
    });


    if (!monthlyLog) {
        monthlyLog = await LoggedHour.create({
            employee: _id,
            lastIn: nowDate,
            logs: { [dayOfMonth]: [{ in: nowTime, schedule }] },
        });
    } else if (monthlyLog) {
        const logOfDay = monthlyLog.logs[dayOfMonth];
        if (logOfDay[0].hasOwnProperty('in') && logOfDay[0].hasOwnProperty('out')) {
            return next(new AppError(`You cannot start tracking today`, 403));

        }
        if (!logOfDay) {
            monthlyLog.lastIn = nowDate;
            monthlyLog.logs[dayOfMonth] = { [dayOfMonth]: [{ in: nowTime, schedule }] };
        } else if (logOfDay) {
            let flag = true;
            for (let index = 0; index < logOfDay.length; index++) {
                flag = logOfDay[index].hasOwnProperty('in') && logOfDay[index].hasOwnProperty('out');
                if (flag == false) break;
            }
            if (flag == true) {
                monthlyLog.logs[dayOfMonth].push({ in: nowTime, schedule });
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

    const bodyGeoPoint = new GeoPoint(bodyCoordinates.lat, bodyCoordinates.long);

    const { location, _id } = res.locals.user;
    const setLocationGeoPoint = new GeoPoint(location.coordinates.lat, location.coordinates.long);

    const distance = bodyGeoPoint.distanceTo(setLocationGeoPoint, true) * 1000; // distance in meters

    if (distance > location.radius)
        return next(new AppError(`You are ${(distance - location.radius).toFixed(2)} meters away from location.`, 403));
    const nowDate = new Date();
    const dayOfMonth = dayjs(nowDate).format('YYYY-MM-DD');

    const nowTime = dayjs(nowDate).format('h:mm A');
    const monthlyLog = await LoggedHour.findOne({
        month: dayjs().format('M-YYYY'),
        employee: _id,
    });
    if (!monthlyLog) {
        return next(new AppError('You first need to start track', 403));
    }
    const { lastIn, logs } = monthlyLog;
    if (logs.hasOwnProperty(dayOfMonth)) {
        for (let index = 0; index < logs[dayOfMonth].length; index++) {
            if (!logs[dayOfMonth][index].hasOwnProperty('out')) {
                logs[dayOfMonth][index] = { ...logs[dayOfMonth][index], out: nowTime };
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
        month: dayjs().format('M-YYYY'),
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

// module.exports.getTimeSheet = catchAsync(async function (req, res, next) {
//     const { startDate, endDate } = req.query;

//     const dateDiff = Math.ceil((dayjs(endDate).endOf('M')).diff((dayjs(startDate).startOf('M')), 'M', true))

//     let months = []
//     for (let index = 0; index < Number(dateDiff); index++) {
//         months.push(dayjs(startDate).add(index, 'M').format('M-YYYY'))
//     }

//     let loggedHours = await LoggedHour.find({ month: { $in: months }, employee: res.locals.user._id }, 'month logs')
//     const startingMonthDay = Number(dayjs(startDate).format('D'))
//     const endingMonthDay = Number(dayjs(endDate).format('D'))

//     for (let i = 0; i < loggedHours.length; i++) {
//         if (loggedHours[i].month == months[0]) {
//             for (let j = 1; j < startingMonthDay; j++) {
//                 if (loggedHours[i].logs.hasOwnProperty(j)) {
//                     delete loggedHours[i].logs[j]
//                 }
//             }
//         }
//         if (loggedHours[i].month == months[months.length - 1]) {
//             for (let j = endingMonthDay; j <= 31; j++) {
//                 delete loggedHours[i].logs[j]
//             }
//         }
//     }

//     // let logs = []
//     // for (let i = 0; i < employeeIds.length; i++) {
//     //     logs.push({ [employeeIds[i]]: loggedHours.filter(e => e.employee.toString() === employeeIds[i].toString()) })
//     // }

//     res.status(200).send({ loggedHours })
// })

// TODO: Add pagination
module.exports.getTimeSheet = catchAsync(async function (req, res, next) {
    const { startDate, endDate, limit, search, sort, mode = 'MONTHLY' } = req.query;

    // _id: { $in: employeeIds },

    // filter employees by search
    const employees = await User.find(
        {
            name: { $regex: `${search}`, $options: 'i' },
            role: 'EMPLOYEE',
        },
        '_id name location schedule'
    )
        .populate({ path: 'location', select: '_id name' })
        .populate({ path: 'schedule', select: '_id title color shiftTimes' })
        .lean();

    // const employeeIds = mergedLoggedHours.map((e) => e.employee);

    const employeeIds = employees.map((e) => e._id.toString());

    // find all worklogs of filtered employees
    // all logs in given time period grouped by month
    const monthlyLoggedHours = await LoggedHour.find(
        {
            createdAt: { $gte: startDate },
            lastIn: { $lte: endDate },
            employee: { $in: employeeIds },
        },
        'employee logs'
    ).lean();

    // all logs grouped by employee
    let mergedLoggedHours = [];

    for (const loggedHour of monthlyLoggedHours) {
        let existingLoggedHour = mergedLoggedHours.find(
            (e) => e.employee.toString() === loggedHour.employee.toString()
        );

        // if cross month logs exist
        if (existingLoggedHour) {
            // merge their ins and outs
            existingLoggedHour.logs = {
                ...existingLoggedHour.logs,
                ...loggedHour.logs,
            };

            break;
        }

        // else group them by employee
        mergedLoggedHours.push({ ...loggedHour });
    }

    let parsingFormat = null;

    if (mode === 'WEEKLY') parsingFormat = 'dddd';
    else if (mode === 'MONTHLY') parsingFormat = 'D';

    mergedLoggedHours.forEach((loggedHour) => {
        loggedHour.employee = employees.find((e) => e._id.toString() === loggedHour.employee.toString());
    });

    mergedLoggedHours.forEach((loggedHour) => {
        Object.keys(loggedHour.logs).forEach((key) => {
            const value = loggedHour.logs[key];
            delete loggedHour.logs[key];

            const date = new Date(key);
            const formattedDate = dayjs(date).format(parsingFormat);
            loggedHour.logs[formattedDate] = value;
        });
    });

    if (mode === 'MONTHLY') {
        const currentDayOfMonth = dayjs().format('D');
        const daysInMonth = getCurrentDaysArray(startDate);
        const updatedMergedLoggedHours = [...mergedLoggedHours];
        const currentMonth = dayjs(startDate).format('MM');
        for (const day of daysInMonth) {
            if (day > currentDayOfMonth) break;

            updatedMergedLoggedHours.forEach((loggedHour) => {
                const correspondingDay = loggedHour.logs[day.toString()];
                if (correspondingDay) return (loggedHour.logs[day.toString()] = 'P');

                const dayOfWeek = convertDayOfMonthToDayOfWeek(day, startDate);

                const isScheduled = loggedHour.employee?.schedule?.shiftTimes[dayOfWeek];

                if (!isScheduled) return (loggedHour.logs[day.toString()] = 'O');

                loggedHour.logs[day.toString()] = 'A';
            });
        }

        mergedLoggedHours = updatedMergedLoggedHours;

        // mergedLoggedHours.forEach((loggedHour) => {
        //     Object.keys(loggedHour.logs).forEach((key) => {
        //         const value = loggedHour.logs[key];
        //         delete loggedHour.logs[key];

        //         const date = new Date(key);
        //         const formattedDate = dayjs(date).format(parsingFormat);
        //         loggedHour.logs[formattedDate] = value;
        //     });
        // });
    }

    // sort by employees
    const timesheet = mergedLoggedHours.map((mergedLoggedHour) => ({
        employee: mergedLoggedHour.employee,
        logs: mergedLoggedHour.logs,
    }));

    const totalDocs = timesheet.length;

    res.status(200).json({ timesheet, totalDocs });
});

module.exports.exportTimesheet = catchAsync(async function (req, res, next) {
    const { startDate, endDate, limit, search, sort, time, format } = req.query;

    // _id: { $in: employeeIds },

    // filter employees by search
    const employees = await User.find(
        {
            name: { $regex: `${search}`, $options: 'i' },
            role: 'EMPLOYEE',
        },
        '_id name location schedule'
    )
        .populate({ path: 'location', select: '_id name' })
        .populate({ path: 'schedule', select: 'shiftTimes' })
        .lean();

    // const employeeIds = mergedLoggedHours.map((e) => e.employee);

    const employeeIds = employees.map((e) => e._id.toString());

    // find all worklogs of filtered employees
    // all logs in given time period grouped by month
    const monthlyLoggedHours = await LoggedHour.find(
        {
            createdAt: { $gte: startDate },
            lastIn: { $lte: endDate },
            employee: { $in: employeeIds },
        },
        'employee logs'
    ).lean();

    // all logs grouped by employee
    const mergedLoggedHours = [];

    for (const loggedHour of monthlyLoggedHours) {
        let existingLoggedHour = mergedLoggedHours.find(
            (e) => e.employee.toString() === loggedHour.employee.toString()
        );

        // if cross month logs exist
        if (existingLoggedHour) {
            // merge their ins and outs
            existingLoggedHour.logs = {
                ...existingLoggedHour.logs,
                ...loggedHour.logs,
            };

            break;
        }

        // else group them by employee
        mergedLoggedHours.push({ ...loggedHour });
    }

    let parsingFormat = 'YYYY-MM-DD';

    mergedLoggedHours.forEach((loggedHour) => {
        Object.keys(loggedHour.logs).forEach((key) => {
            const value = loggedHour.logs[key];
            delete loggedHour.logs[key];

            const date = new Date(key);
            const formattedDate = dayjs(date).format(parsingFormat);
            loggedHour.logs[formattedDate] = value;
        });
    });

    const csvData = [];
    mergedLoggedHours.forEach((e) => {
        const populatedEmployee = employees.find((employee) => employee._id.toString() === e.employee.toString());
        Object.entries(e.logs).forEach(([key, value]) => {
            value.forEach((interval) => {
                const id = getLastCharacters(populatedEmployee._id.toString(), 4);
                const date = dayjs(new Date(key)).format('D MMMM YYYY');
                const day = dayjs(new Date(key)).format('dddd');
                const scheduleIn = populatedEmployee.schedule?.shiftTimes[day]?.in;
                const scheduleOut = populatedEmployee.schedule?.shiftTimes[day]?.out;

                const row = {
                    Date: date,
                    Day: day,
                    Id: id,
                    Name: populatedEmployee.name,
                    'Clock In': interval['in'],
                    'Scheduled In': scheduleIn,
                    'Scheduled Out': scheduleOut,
                };

                if (time == '24') row['Clock In'] = dayjs('1/1/1 ' + interval['in']).format('H:mm');

                if (interval['out']) {
                    row['Clock Out'] = interval['out'];

                    if (time == '24') row['Clock Out'] = dayjs('1/1/1 ' + interval['out']).format('H:mm');
                }

                csvData.push(row);
            });
        });
    });

    let file = null;

    if (format === 'csv') {
        const json2csv = new Parser({
            fields: ['Date', 'Day', 'Id', 'Name', 'Clock In', 'Clock Out', 'Scheduled In', 'Scheduled Out'],
        });
        file = json2csv.parse(csvData);
    } else {
        const styles = {
            headerDark: {
                fill: {
                    fgColor: {
                        rgb: 'FF000000',
                    },
                },
                font: {
                    color: {
                        rgb: 'FFFFFFFF',
                    },
                    sz: 14,
                    bold: true,
                    underline: true,
                },
            },
            cellPink: {
                fill: {
                    fgColor: {
                        rgb: 'FFFFCCFF',
                    },
                },
            },
            cellGreen: {
                fill: {
                    fgColor: {
                        rgb: 'FF00FF00',
                    },
                },
            },
        };

        //Array of objects representing heading rows (very top)
        const heading = [
            [
                { value: 'a1', style: styles.headerDark },
                { value: 'b1', style: styles.headerDark },
                { value: 'c1', style: styles.headerDark },
            ],
            ['a2', 'b2', 'c2'], // <-- It can be only values
        ];

        //Here you specify the export structure
        const specification = {
            Date: {
                // <- the key should match the actual data key
                displayName: 'Date', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                // cellStyle: function (value, row) {
                //   // <- style renderer function
                //   // if the status is 1 then color in green else color in red
                //   // Notice how we use another cell value to style the current one
                //   return row.status_id == 1
                //     ? styles.cellGreen
                //     : { fill: { fgColor: { rgb: "FFFF0000" } } }; // <- Inline cell style is possible
                // },
                width: 120, // <- width in pixels
            },
            Day: {
                displayName: 'Day',
                headerStyle: styles.headerDark,
                // cellFormat: function (value, row) {
                //   // <- Renderer function, you can access also any row.property
                //   return value == 1 ? "Active" : "Inactive";
                // },
                width: '120', // <- width in chars (when the number is passed as string)
            },
            Id: {
                displayName: 'Id',
                headerStyle: styles.headerDark,
                cellStyle: styles.cellPink, // <- Cell style
                width: 50, // <- width in pixels
            },
            Name: {
                displayName: 'Name',
                headerStyle: styles.headerDark,
                cellStyle: styles.cellPink, // <- Cell style
                width: 220, // <- width in pixels
            },
            'Clock In': {
                displayName: 'Clock In',
                headerStyle: styles.headerDark,
                cellStyle: styles.cellPink, // <- Cell style
                width: 220, // <- width in pixels
            },
            'Clock Out': {
                displayName: 'Clock Out',
                headerStyle: styles.headerDark,
                cellStyle: styles.cellPink, // <- Cell style
                width: 220, // <- width in pixels
            },
        };

        // The data set should have the following shape (Array of Objects)
        // The order of the keys is irrelevant, it is also irrelevant if the
        // dataset contains more fields as the report is build based on the
        // specification provided above. But you should have all the fields
        // that are listed in the report specification

        // Define an array of merges. 1-1 = A:1
        // The merges are independent of the data.
        // A merge will overwrite all data _not_ in the top-left cell.
        const merges = [
            { start: { row: 1, column: 1 }, end: { row: 1, column: 10 } },
            { start: { row: 2, column: 1 }, end: { row: 2, column: 5 } },
            { start: { row: 2, column: 6 }, end: { row: 2, column: 10 } },
        ];

        // Create the excel report.
        // This function will return Buffer
        file = excel.buildExport([
            // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
            {
                name: 'Timesheet', // <- Specify sheet name (optional)
                heading: heading, // <- Raw heading array (optional)
                merges: merges, // <- Merge cell ranges
                specification: specification, // <- Report specification
                data: csvData, // <-- Report data
            },
        ]);
    }

    res.attachment(`Timesheet.${format}`);
    res.status(200).send(file);
});
