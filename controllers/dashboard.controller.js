const { promisify } = require('util');
const _ = require('lodash');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');

const validator = require('email-validator');
const fs = require('file-system');
const csv = require('csvtojson');
const path = require('path');
const { signToken } = require('../utils/jwt');
const User = require('../models/users.model');
const LoggedHour = require('../models/loggedHours.model');

const { getLocationsByManager } = require('../controllers/locations.controller')

const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

var getDaysArray = function (s, e) { for (var a = [], d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) { a.push(dayjs(d).format('YYYY-MM-DD')); } return a; };


const getEmployeesByFilter = ({ managerId, filter, ids }) => {
    return new Promise((resolve, reject) => {
        for (const id of ids) {
            if (!mongoose.isValidObjectId(id)) reject(new AppError('Please select valid locations', 400));
        }

        const additionalQuery = {};
        if (filter === 'LOCATION') additionalQuery.location = { $in: ids };
        else additionalQuery.schedule = { $in: ids };

        User.find({
            role: 'EMPLOYEE',
            manager: managerId,
        }, '_id name location schedule')
            .populate({ path: 'schedule', select: '_id title shiftTimes' })
            .then((employees) => {
                const employeeIds = employees.map((e) => e._id);
                resolve({ employees, employeeIds });
            })
            .catch((err) => reject(err));
    });
};

const getMetricsByEmployees = (logs) => {
    const metricsByEmployees = [];

    logs.forEach((log) => {
        let totalLateDaysOfSingleLog = 0,
            totalLateTimeOfSingleLog = 0;

        Object.values(log.logs).forEach((day) => {
            day.forEach((entry) => {
                if (entry.latePunched) totalLateDaysOfSingleLog++;
                totalLateTimeOfSingleLog += entry.lateTime;
            });
        });

        const logIndex = metricsByEmployees.findIndex((e) => e.employee._id.toString() === log.employee._id.toString());
        if (logIndex !== -1) {
            metricsByEmployees[logIndex].days += totalLateDaysOfSingleLog;
            metricsByEmployees[logIndex].time += totalLateTimeOfSingleLog;
        } else {
            metricsByEmployees.push({
                employee: log.employee,
                days: totalLateDaysOfSingleLog,
                time: totalLateTimeOfSingleLog,
            });
        }
    });

    return metricsByEmployees;
}

const getMetricsByLocation = ({ metrics, locations }) => {
    const metricsByLocation = [];

    locations.forEach((location) => {

        const correspondingMetrics = metrics.filter((metric) => metric.employee.location.toString() === location._id.toString());

        metricsByLocation.push({ location, metrics: correspondingMetrics })

    });

    return metricsByLocation;
}

const getOnTimePercentageByLocation = async ({ logs, managerId }) => {
    const metrics = getMetricsByEmployees(logs);

    const locations = await getLocationsByManager(managerId);

    const metricsByLocation = getMetricsByLocation({ metrics, locations });

    metricsByLocation.forEach((m) => {
        const lateDaysArray = [0, ...m.metrics.map((e) => e.days)];
        const lateDaysSum = lateDaysArray.reduce((a, b) => a + b);
        const latePercentage = (lateDaysSum * 100) / m.metrics.length;
        const onTimePercentage = 100 - latePercentage;

        m.onTimePercentage = onTimePercentage;
        delete m.metrics;
    })

    return metricsByLocation;
}
const getMetricsByDate = (logs) => {
    const metricsByDates = {};

    logs.forEach((log) => {

        const days = {};


        Object.entries(log.logs).forEach(([day, dayEntries]) => {
            let totalLateDaysOfSingleDay = 0,
                totalLateTimeOfSingleDay = 0,
                totalEntriesOfSingleDay = 0;
            dayEntries.forEach((entry) => {
                if (entry.latePunched) totalLateDaysOfSingleDay++;
                totalEntriesOfSingleDay++;
                totalLateTimeOfSingleDay += entry.lateTime;
            });
            days[day] = { days: totalLateDaysOfSingleDay, time: totalLateTimeOfSingleDay, entries: totalEntriesOfSingleDay };
        });


        Object.entries(days).forEach(([day, dayEntry]) => {
            if (metricsByDates[day]) {
                dayEntry.days += days.days;
                dayEntry.time += days.time;
                dayEntry.entries += days.entries;
            } else {
                metricsByDates[day] = dayEntry;
            }
        })
    });

    return metricsByDates;
}


const getOnTimePercentageByDate = async ({ startDate, endDate, employeeIds }) => {
    const startMonth = startDate.startOf('month').toDate();
    const endMonth = endDate.endOf('month').toDate();

    const logs = await LoggedHour.find({
        employee: { $in: employeeIds },
        createdAt: { $gte: startMonth },
        lastIn: { $lte: endMonth },
    }).lean();

    const dates = getDaysArray(startDate.toDate(), endDate.toDate());

    const metricsByDate = getMetricsByDate(logs);

    Object.entries(metricsByDate).forEach(([key, value]) => {
        const latePercentage = (value.days * 100) / value.entries;
        const onTimePercentage = 100 - latePercentage;
        metricsByDate[key] = onTimePercentage;
    })

    dates.forEach((day) => {
        if (!metricsByDate[day]) metricsByDate[day] = 0;
    })

    return metricsByDate;
}

const getAttendanceMetricsByEmployees = ({ logs, startDate, endDate }) => {
    const metricsByEmployees = [];

    const dates = getDaysArray(startDate.toDate(), endDate.toDate());

    logs.forEach((log) => {
        let totalPresents = 0,
            totalLates = 0,
            totalAbsents = 0,
            totalOffs = 0;

        dates.forEach((date) => {

            const logOfDate = log.logs[date];
            const dayOfWeek = dayjs(date).format('dddd');

            const schedule = log.employee.schedule?.shiftTimes[dayOfWeek];

            if (!logOfDate) {

                if (!schedule) totalOffs++;
                else totalAbsents++;

            } else {
                logOfDate.forEach((entry) => {

                    if (entry.latePunched) totalLates++;
                    else totalPresents++;

                });
            }

        })

        const index = metricsByEmployees.findIndex((e) => e.employee._id.toString() === log.employee._id.toString());

        if (index !== -1) {
            metricsByEmployees[index].totalPresents += totalPresents;
            metricsByEmployees[index].totalLates += totalLates;
            metricsByEmployees[index].totalAbsents += totalAbsents;
            metricsByEmployees[index].totalOffs += totalOffs;
        } else {
            metricsByEmployees.push({
                employee: log.employee,
                totalPresents,
                totalLates,
                totalAbsents,
                totalOffs,
            });
        }
    });


    return metricsByEmployees;
}

const getAttendanceByLocation = async ({ managerId, logs, startDate, endDate }) => {

    const metrics = await getAttendanceMetricsByEmployees({ logs, startDate, endDate });

    const locations = await getLocationsByManager(managerId);

    const metricsByLocation = [];

    locations.forEach((location) => {

        const correspondingMetrics = metrics.filter((metric) => metric.employee.location.toString() === location._id.toString());

        correspondingMetrics.forEach((m) => delete m.employee);


        metricsByLocation.push({ location, metrics: correspondingMetrics })

    });

    return metricsByLocation;
}

const getAbsentMetricsByEmployees = ({ logs, startDate, endDate }) => {
    const metricsByEmployees = [];

    const dates = getDaysArray(startDate.toDate(), endDate.toDate());

    logs.forEach((log) => {

        let absentees = 0, lates = 0;

        dates.forEach((date) => {

            const logOfDate = log.logs[date];
            const dayOfWeek = dayjs(date).format('dddd');

            const schedule = log.employee.schedule?.shiftTimes[dayOfWeek];

            if (!logOfDate && schedule) absentees++;

            if (logOfDate)
                logOfDate.forEach((entry) => {
                    if (entry.latePunched) lates++;
                });

        });

        const index = metricsByEmployees.findIndex((e) => e.employee._id.toString() === log.employee._id.toString());
        if (index !== -1) {
            metricsByEmployees[index].absentees += absentees;
            metricsByEmployees[index].lates += lates;
        } else {
            metricsByEmployees.push({
                employee: log.employee,
                absentees,
                lates,
            });
        }

    })

    return metricsByEmployees;

}

const getAbsentPercentage = ({ logs, startDate, endDate }) => {

    const metricsByEmployees = getAbsentMetricsByEmployees({ logs, startDate, endDate });

    const dates = getDaysArray(startDate.toDate(), endDate.toDate());


    const absenteesArray = [0, 0], latesArray = [0, 0];

    metricsByEmployees.forEach((m) => {
        absenteesArray.push(m.absentees);
        latesArray.push(m.lates);
    });

    const absenteesSum = absenteesArray.reduce((a, b) => a + b),
        latesSum = latesArray.reduce((a, b) => a + b);

    const absentPercentage = parseInt((absenteesSum * 100) / dates.length),
        latePercentage = parseInt((latesSum * 100) / dates.length);


    return { latePercentage, absentPercentage };

}

module.exports.getEmployees = catchAsync(async function (req, res, next) {
    const managerId = res.locals.user._id
    const startDate = dayjs(req.query.startDate).utc();
    const endDate = dayjs(req.query.endDate).utc();

    const ids = req.query.ids.split(',');
    const { employees, employeeIds } = await getEmployeesByFilter({ managerId, filter: req.params.filter, ids });

    const logs = await LoggedHour.find({
        employee: { $in: employeeIds },
        createdAt: { $gte: startDate.startOf('month').format() },
        lastIn: { $lte: endDate.endOf('month').format() },
    })
        .populate({
            path: 'employee',
            select: '_id name location schedule',
            populate: {
                path: 'schedule',
                select: '_id title shiftTimes'
            }
        })
        .lean();

    const [onTimePercentageByLocation, onTimePercentageByDate, attendanceByLocation] = await Promise.all([
        getOnTimePercentageByLocation({ employees, employeeIds, logs, managerId }),
        getOnTimePercentageByDate({ startDate, endDate, employeeIds }),
        getAttendanceByLocation({ managerId, logs, startDate, endDate })
    ])

    const { latePercentage, absentPercentage } = getAbsentPercentage({ logs, startDate, endDate });

    res.status(200).json({ onTimePercentageByLocation, onTimePercentageByDate, attendanceByLocation, latePercentage, absentPercentage });
});
