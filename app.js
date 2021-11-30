const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

const Database = require('./utils/db');
const SendGrid = require('./utils/sendGrid');
const AppError = require('./utils/AppError');

// const normalCustomersRoute = require('./routes/normalCustomers.route');
// const vipCustomersRoute = require('./routes/vipCustomers.route');
// const shopsRoute = require('./routes/shops.route');
// const productGroupsRoute = require('./routes/productGroups.route');
// const productsRoute = require('./routes/products.route');
// const rawMaterialExpensesRoute = require('./routes/rawMaterialExpenses.route');
// const shopExpensesRoute = require('./routes/shopExpenses.route');
// const salariesExpensesRoute = require('./routes/salariesExpenses.route');
// const employeesRoute = require('./routes/employees.route');
// const inventoriesRoute = require('./routes/inventories.route');
// const billsRoute = require('./routes/bills.route');
// const auditRoute = require('./routes/audit.route');
// const authRoute = require('./routes/auth.route');

const adminUsersRoute = require('./routes/adminUsers.route');
const locationsRoute = require('./routes/locations.route');
const schedulesRoute = require('./routes/schedules.route');
const managerUsersRoute = require('./routes/managerUsers.route');
const employeeUsersRoute = require('./routes/employeeUsers.route');
const usersRoute = require('./routes/users.route');
const groupsRoute = require('./routes/groups.route');

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

    app.use('/admins', adminUsersRoute);
    app.use('/locations', locationsRoute);
    app.use('/schedules', schedulesRoute);
    app.use('/managers', managerUsersRoute);
    app.use('/employees', employeeUsersRoute);
    app.use('/groups', groupsRoute);
    app.use('/users', usersRoute);

    // app.use('/products', tilesRoute);
    // app.use('/normal-customers', normalCustomersRoute);
    // app.use('/vip-customers', vipCustomersRoute);
    // app.use('/shops', shopsRoute);
    // app.use('/product-groups', productGroupsRoute);
    // app.use('/products', productsRoute);
    // app.use('/raw-material-expenses', rawMaterialExpensesRoute);
    // app.use('/shop-expenses', shopExpensesRoute);
    // app.use('/salaries', salariesExpensesRoute);
    // app.use('/employees', employeesRoute);
    // app.use('/inventories', inventoriesRoute);
    // app.use('/bills', billsRoute);
    // app.use('/audit', auditRoute);
    // app.use('/auth', authRoute);

    app.use('*', (req, res, next) => next(new AppError(`Cannot find ${req.originalUrl} on the server!`, 404)));

    app.use(errorController);
});
