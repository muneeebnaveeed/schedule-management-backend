const router = require('express').Router();

const { getEmployees } = require('../controllers/dashboard.controller');

const { authentication, authorization } = require('../middlewares/auth.middleware');

// router.get('/locations', authentication, authorization('MANAGER'), getByLocations);
// router.get('/schedules', authentication, authorization('MANAGER'), getBySchedules);
router.get('/filter/:filter', authentication, authorization('MANAGER'), getEmployees);

module.exports = router;
