const router = require('express').Router();

const { getAll, addOne, edit, remove, assignOpenSchedule } = require('../controllers/schedules.controller');
const autoParams = require('../utils/autoParams');

router.get('/', autoParams, getAll);
router.route('/').post(addOne);
router.route('/id/:id').patch(edit);
router.patch('/open-schedule/employeeId/:employeeId', assignOpenSchedule);
router.route('/id/:id').delete(remove);

module.exports = router;
