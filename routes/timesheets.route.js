const router = require('express').Router();

const { getTimeSheet, exportTimesheet } = require('../controllers/timesheets.controller');
const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.get('/', protect('MANAGER'), getTimeSheet);
router.get('/export', autoParams, protect('MANAGER'), exportTimesheet);

module.exports = router;
