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
const LoggedHour = require('../models/loggedHours.model');

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

// TODO: Add pagination
module.exports.getTimeSheet = catchAsync(async function (req, res, next) {
    const { startDate, endDate, limit, search, sort, mode = 'MONTHLY' } = req.query;
    const utcStartDate = dayjs(startDate).tz('Greenwich', true).toDate();
    // _id: { $in: employeeIds },

    // filter employees by search
    const employees = await User.find(
        {
            name: { $regex: `${search}`, $options: 'i' },
            role: 'EMPLOYEE',
            admin: res.locals.user.admin._id,
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
            createdAt: { $gte: utcStartDate },
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
            const formattedDate = dayjs(date).utc().format(parsingFormat);
            loggedHour.logs[formattedDate] = value;
        });
    });

    if (mode === 'MONTHLY') {
        const currentDayOfMonth = dayjs().utc().format('D');
        const daysInMonth = getCurrentDaysArray(utcStartDate);
        const updatedMergedLoggedHours = [...mergedLoggedHours];
        const currentMonth = dayjs(utcStartDate).utc().format('MM');
        for (const day of daysInMonth) {
            if (day > currentDayOfMonth) break;

            updatedMergedLoggedHours.forEach((loggedHour) => {
                const correspondingDay = loggedHour.logs[day.toString()];
                if (correspondingDay) return (loggedHour.logs[day.toString()] = 'P');

                const dayOfWeek = convertDayOfMonthToDayOfWeek(day, utcStartDate);

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
    const { startDate, endDate, limit, search, sort, time, format, timeZone } = req.query;

    console.log({ startDate, endDate, limit, search, sort, time, format, timeZone });

    const utcStartDate = dayjs(startDate).utc().format();
    const utcEndDate = dayjs(endDate).utc().format();
    //
    //
    // _id: { $in: employeeIds },

    // filter employees by search
    const employees = await User.find(
        {
            name: { $regex: `${search}`, $options: 'i' },
            role: 'EMPLOYEE',
            manager: res.locals.user._id,
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
            createdAt: { $gte: utcStartDate },
            lastIn: { $lte: utcEndDate },
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

            const formattedDate = dayjs(key).utc().format(parsingFormat);
            loggedHour.logs[formattedDate] = value;
        });
    });

    const csvData = [];
    mergedLoggedHours.forEach((e) => {
        const populatedEmployee = employees.find((employee) => employee._id.toString() === e.employee.toString());
        Object.entries(e.logs).forEach(([key, value]) => {
            value.forEach((interval) => {
                const id = getLastCharacters(populatedEmployee._id.toString(), 4);
                const date = dayjs(new Date(key)).utc().format('D MMMM YYYY');
                const day = dayjs(new Date(key)).utc().format('dddd');
                const scheduleIn = populatedEmployee.schedule?.shiftTimes[day]?.in;
                const scheduleOut = populatedEmployee.schedule?.shiftTimes[day]?.out;

                const row = {
                    Date: dayjs(new Date(key)).tz(timeZone).format('DD/MM/YYYY'),
                    Day: dayjs(new Date(key)).tz(timeZone).format('dddd'),
                    Id: id,
                    Name: populatedEmployee.name,
                    'Clock In': dayjs(interval['in']).tz(timeZone).format('HH:mm'),
                    'Scheduled In': scheduleIn ? dayjs(scheduleIn).tz(timeZone).format('HH:mm') : undefined,
                    'Scheduled Out': scheduleOut ? dayjs(scheduleOut).tz(timeZone).format('HH:mm') : undefined,
                };

                if (time == '12') {
                    row['Clock In'] = dayjs(interval['in']).tz(timeZone).format('h:mm A');
                    row['Scheduled In'] = scheduleIn ? dayjs(scheduleIn).tz(timeZone).format('h:mm A') : undefined;
                    row['Scheduled Out'] = scheduleOut ? dayjs(scheduleOut).tz(timeZone).format('h:mm A') : undefined;
                }

                if (interval['out']) {
                    row['Clock Out'] = dayjs(interval['out']).tz(timeZone).format('HH:mm');

                    if (time == '12') row['Clock Out'] = dayjs(interval['out']).tz(timeZone).format('h:mm A');
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
