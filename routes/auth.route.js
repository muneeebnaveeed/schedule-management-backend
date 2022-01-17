const router = require('express').Router();

const {
    loginUser,
    registerAdmin,
    acceptManager,
    decodeToken,
    requestForgetPassword,
    changePassword,
} = require('../controllers/auth.controller');

router.post('/login', loginUser);
router.route('/register').post(registerAdmin);
router.post('/accept', acceptManager);
router.get('/decode/token/:token', decodeToken);

router.post('/forget-password', requestForgetPassword);
router.post('/change-password', changePassword);

module.exports = router;
