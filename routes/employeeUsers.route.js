const router = require('express').Router();

const {
    loginUser,
    getAll,
    getOne,
    setPassword,
    assignManager,
    assignSchedule,
    startTracking,
    stopTracking,
    getLastTracking,
    getTimeSheet
} = require('../controllers/EmployeeUsers.controller');
const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.post('/login', loginUser);
router.get('/', getAll);
router.get('/id/:id', getOne);
router.post('/set-password/id/:id', setPassword);
router.post('/assign-manager/id/:employeeid', assignManager);
router.post('/assign-schedule/id/:employeeid', assignSchedule);

router.post('/start-tracking', protect('EMPLOYEE'), startTracking);
router.post('/stop-tracking', protect('EMPLOYEE'), stopTracking);
router.get('/get-last-tracking', protect('EMPLOYEE'), getLastTracking);

router.get('/time-sheet', autoParams, protect('EMPLOYEE'), getTimeSheet);

module.exports = router;
