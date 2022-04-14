const router = require('express').Router();

const { getEmployees, getSnapshot } = require('../controllers/dashboard.controller');

const { authentication, authorization } = require('../middlewares/auth.middleware');

// router.get('/locations', authentication, authorization('MANAGER'), getByLocations);
// router.get('/schedules', authentication, authorization('MANAGER'), getBySchedules);
router.get('/filter/:filter', authentication, authorization('MANAGER', 'ADMIN'), getEmployees);
router.get('/snapshot/filter/:filter', authentication, authorization('MANAGER', 'ADMIN'), getSnapshot);


module.exports = router;
