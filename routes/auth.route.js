const router = require('express').Router();

const { loginUser, registerAdmin, acceptManager } = require('../controllers/auth.controller');

router.post('/login', loginUser);
router.route('/register').post(registerAdmin);
router.post('/accept', acceptManager);

module.exports = router;
