const router = require('express').Router();

const { getRoster, publishRoster, getRosterByEmployee } = require('../controllers/roster.controller');
const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.get('/', autoParams, protect('MANAGER'), getRoster);
router.get('/single', autoParams, protect('EMPLOYEE'), getRosterByEmployee);
router.post('/', autoParams, protect('MANAGER'), publishRoster);

module.exports = router;
