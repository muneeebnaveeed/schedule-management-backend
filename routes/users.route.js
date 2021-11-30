const router = require('express').Router();

const { loginUser } = require('../controllers/users.controller');

router.post('/login', loginUser);

module.exports = router;
