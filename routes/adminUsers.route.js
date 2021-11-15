const router = require('express').Router();

const { loginUser, registerUser } = require('../controllers/adminUsers.controller');

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);

module.exports = router;
