const router = require('express').Router();

const { getAll, addOne, edit, remove, assignOpenSchedule, getAllByAdmin } = require('../controllers/schedules.controller');
const autoParams = require('../utils/autoParams');
const { protect } = require('../middlewares/protect.middleware');
const { authentication, authorization } = require('../middlewares/auth.middleware');

router.get('/', autoParams, protect('MANAGER'), getAll);
router.get('/admin', autoParams, authentication, authorization('ADMIN'), getAllByAdmin);
router.post('/', protect('MANAGER'), addOne);
router.route('/id/:id').patch(edit);
router.patch('/open-schedule/employeeId/:employeeId', assignOpenSchedule);
router.route('/id/:id').delete(remove);

module.exports = router;
