const router = require('express').Router();

const { getAll, addOne, edit, remove, assignOpenSchedule } = require('../controllers/schedules.controller');
const autoParams = require('../utils/autoParams');
const { protect } = require('../middlewares/protect.middleware');

router.get('/', autoParams, protect('MANAGER'), getAll);
router.post('/', protect('MANAGER'), addOne);
router.route('/id/:id').patch(edit);
router.patch('/open-schedule/employeeId/:employeeId', assignOpenSchedule);
router.route('/id/:id').delete(remove);

module.exports = router;
