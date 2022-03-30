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

const { catchAsync } = require('./errors.controller');
const AppError = require('../utils/AppError');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

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
        })
            .then((employeesByLocations) => {
                const employeeIds = employeesByLocations.map((e) => e._id);
                resolve(employeeIds);
            })
            .catch((err) => reject(err));
    });
};

const calculateAverageWorkHours = ({ logs }) => {
    // 2. CALCULATE WORK HOURS OF EACH EMPLOYEE
    const workHoursByEmployees = [];

    logs.forEach((log) => {
        let totalWorkHoursOfSingleLog = 0;

        Object.values(log.logs).forEach((day) => {
            day.forEach((entry) => {
                const inTime = dayjs(entry.in);
                const hours = inTime.diff(entry.out, 'hours');
                totalWorkHoursOfSingleLog += hours;
            });
        });

        const logIndex = workHoursByEmployees.findIndex((e) => e.employee === log.employee.toString());
        if (logIndex !== -1) {
            workHoursByEmployees[logIndex].hours += totalWorkHoursOfSingleLog;
        } else {
            workHoursByEmployees.push({
                employee: log.employee.toString(),
                hours: totalWorkHoursOfSingleLog,
            });
        }
    });

    // 3. CALCULATE TOTAL WORK HOURS
    const totalWorkHours = [{ hours: 0 }, ...workHoursByEmployees].map((e) => e.hours).reduce((a = 0, b) => a + b);

    // 4. GET AVERAGE WORK HOURS
    return totalWorkHours / workHoursByEmployees.length;
};

const getLateMetrics = ({ logs }) => {
    // 2. CALCULATE LATE DAYS OF EACH EMPLOYEE
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

        const logIndex = metricsByEmployees.findIndex((e) => e.employee === log.employee.toString());
        if (logIndex !== -1) {
            metricsByEmployees[logIndex].days += totalLateDaysOfSingleLog;
            metricsByEmployees[logIndex].time += totalLateTimeOfSingleLog;
        } else {
            metricsByEmployees.push({
                employee: log.employee.toString(),
                days: totalLateDaysOfSingleLog,
                time: totalLateTimeOfSingleLog,
            });
        }
    });

    // 3. CALCULATE TOTAL LATE DAYS & TIME
    const totalLateDays = [{ days: 0 }, ...metricsByEmployees].map((e) => e.days).reduce((a = 0, b) => a + b);
    const totalLateTime = [{ time: 0 }, ...metricsByEmployees].map((e) => e.time).reduce((a = 0, b) => a + b);

    // 4. GET AVERAGE LATE DAYS & TIME
    const avgLateDays = totalLateDays / metricsByEmployees.length;
    const avgLateTime = parseInt(totalLateTime / metricsByEmployees.length);

    return { avgLateDays, avgLateTime };
};

module.exports.getEmployees = catchAsync(async function (req, res, next) {
    const currentManager = res.locals.user;
    const startDate = dayjs(req.query.startDate).utc().format();
    const endDate = dayjs(req.query.endDate).utc().format();

    const ids = req.query.ids.split(',');
    const employeeIds = await getEmployeesByFilter({ managerId: currentManager._id, filter: req.params.filter, ids });

    const logs = await LoggedHour.find({
        employee: { $in: employeeIds },
        createdAt: { $gte: startDate },
        lastIn: { $lte: endDate },
    }).lean();

    // CALCULATE AVG WORK HOURS
    const avgWorkHours = calculateAverageWorkHours({ logs });

    // CALCULATE AVG LATE DAYS
    const { avgLateDays, avgLateTime } = getLateMetrics({ logs });

    const daysInRange = dayjs(endDate).diff(startDate, 'days');
    const onTimePercentage = 100 - (avgLateDays * 100) / daysInRange;
    const latePercentage = (avgLateDays * 100) / daysInRange;

    res.status(200).json({ avgWorkHours, avgLateDays, avgLateTime, onTimePercentage, latePercentage });
});
