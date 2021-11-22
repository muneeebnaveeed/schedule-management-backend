const router = require('express').Router();

const { loginUser, registerUser } = require('../controllers/adminUsers.controller');

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
// router.get('/', getAll);

module.exports = router;
