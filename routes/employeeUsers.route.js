const router = require('express').Router();

const { loginUser, getAll, getOne, register, setPassword } = require('../controllers/EmployeeUsers.controller');

router.post('/login', loginUser);
router.get('/', getAll);
router.get('/id/:id', getOne);
router.post('/register', register);
router.post('/set-password/id/:id', setPassword);

module.exports = router;
