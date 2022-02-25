const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

const Database = require('./utils/db');
const SendGrid = require('./utils/sendGrid');
const AppError = require('./utils/AppError');

const usersRoute = require('./routes/users.route');
const adminUsersRoute = require('./routes/adminUsers.route');
const locationsRoute = require('./routes/locations.route');
const schedulesRoute = require('./routes/schedules.route');
const managerUsersRoute = require('./routes/managerUsers.route');
const employeeUsersRoute = require('./routes/employeeUsers.route');
const authRoute = require('./routes/auth.route');
const tagsRoute = require('./routes/tags.route');
const rosterRoute = require('./routes/roster.route');
const dashboardRoute = require('./routes/dashboard.route');
const superAdminRoute = require('./routes/superAdmin.route');
const timesheetsRoute = require('./routes/timesheets.route');

const { errorController } = require('./controllers/errors.controller');

const app = express();

dotenv.config();

const port = process.env.PORT || 5500;

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    new Database()
        .connect()
        .then(() => console.log('Connected to DB'))
        .catch((err) => console.log(err.message));
    new SendGrid().setApiKey();

    app.use(express.json());

    app.use(cors());

    app.get('/', (req, res) => {
        res.status(200).send(`Server running at PORT ${port}`);
    });

    app.use('/users', usersRoute);

    app.use('/admins', adminUsersRoute);
    app.use('/locations', locationsRoute);
    app.use('/schedules', schedulesRoute);
    app.use('/managers', managerUsersRoute);
    app.use('/employees', employeeUsersRoute);
    app.use('/tags', tagsRoute);
    app.use('/auth', authRoute);
    app.use('/roster', rosterRoute);
    app.use('/dashboard', dashboardRoute);
    app.use('/superAdmin', superAdminRoute);
    app.use('/timesheets', timesheetsRoute);

    app.use('*', (req, res, next) => next(new AppError(`Cannot find ${req.originalUrl} on the server!`, 404)));

    app.use(errorController);
});
