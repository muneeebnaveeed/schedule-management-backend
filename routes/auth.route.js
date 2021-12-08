const router = require('express').Router();

const { loginUser, registerAdmin, acceptManager, decodeToken } = require('../controllers/auth.controller');

router.post('/login', loginUser);
router.route('/register').post(registerAdmin);
router.post('/accept', acceptManager);
router.get('/decode/token/:token', decodeToken);

module.exports = router;
