const mongoose = require('mongoose');
const dayjs = require('dayjs');
const User = require('../models/users.model');
const { catchAsync } = require('./errors.controller');
const Model = require('../models/roster.model');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

module.exports.getRoster = catchAsync(async function (req, res, next) {
    const { date, locations } = req.query;

    const currentAdmin = res.locals.user.admin._id;

    const additionalQuery = {};

    if (locations?.length) additionalQuery.location = locations;

    // get all employees
    const employees = await User.find(
        {
            role: 'EMPLOYEE',
            manager: res.locals.user._id,
            admin: currentAdmin,
            ...additionalQuery,
        },
        '_id name location schedule'
    )
        .populate({ path: 'location', select: '_id name' })
        .populate({ path: 'schedule', select: '_id title color shiftTimes' })
        .lean();

    console.log(employees);

    // get all roster within the date
    let roster = await Model.findOne({
        createdAt: date,
        manager: res.locals.user._id,
        admin: currentAdmin,
    }).lean();

    // if no roster then show employees' currently assigned schedules
    if (!roster)
        roster = employees.map((employee) => {
            const selectedEmployee = {
                _id: employee._id,
                name: employee.name,
                email: employee.email,
            };

            const shift = {};

            if (employee.schedule)
                Object.entries(employee.schedule.shiftTimes).forEach(([key, value]) => {
                    shift[key] = { ...value, title: employee.schedule.title, color: employee.schedule.color };
                });

            return {
                employee: selectedEmployee,
                shift,
            };
        });
    else roster = roster.entries;

    res.status(200).json(roster);
});

module.exports.getRosterByEmployee = catchAsync(async function (req, res, next) {
    const currentEmployee = res.locals.user;
    const currentAdmin = currentEmployee.admin;

    const { date } = req.query;

    // get all roster within the date
    let roster = await Model.findOne({
        createdAt: date,
        admin: currentAdmin._id.toString(),
        manager: currentEmployee.manager,
    }).lean();

    if (roster)
        roster = roster.entries.find((row) => row.employee._id.toString() === currentEmployee._id.toString())?.shift;

    // if no roster then show employees' currently assigned schedules
    if (!roster) {
        const shift = {};
        if (currentEmployee.schedule)
            Object.entries(currentEmployee.schedule.shiftTimes).forEach(([key, value]) => {
                shift[key] = { ...value, title: currentEmployee.schedule.title, color: currentEmployee.schedule.color };
            });

        roster = shift;
    }

    res.status(200).json(roster);
});

module.exports.publishRoster = catchAsync(async function (req, res, next) {
    const currentAdmin = res.locals.user.admin._id;

    const existingRoster = await Model.findOne({
        admin: currentAdmin,
        createdAt: req.query.date,
    });

    if (!existingRoster) {
        await Model.create({
            admin: currentAdmin,
            manager: res.locals.user._id,
            entries: req.body,
            createdAt: req.query.date,
        });
    } else {
        existingRoster.entries = req.body;
        await existingRoster.save();
    }

    res.status(200).json();
});
