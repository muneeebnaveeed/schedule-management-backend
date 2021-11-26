const router = require('express').Router();

const {
    loginUser,
    getAll,
    getOne,
    setPassword,
    assignManager,
    assignSchedule,
} = require('../controllers/EmployeeUsers.controller');

router.post('/login', loginUser);
router.get('/', getAll);
router.get('/id/:id', getOne);
router.post('/set-password/id/:id', setPassword);
router.post('/assign-manager/id/:employeeid', assignManager);
router.post('/assign-schedule/id/:employeeid', assignSchedule);

module.exports = router;
