const router = require('express').Router();
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const {
    getAll,
    loginUser,
    registerUser,
    inviteManagers,
    importEmployees,
    decodeToken,
} = require('../controllers/adminUsers.controller');
const { protect } = require('../middlewares/protect.middleware');

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.post('/invite-managers/admin-id/id/:adminid/manager-email/:emails', protect, inviteManagers);
router.post('/import-employees/admin-id/id/:adminid', upload.single('file'), protect, importEmployees);
router.get('/', protect, getAll);
router.get('/decode/token/:token', protect, decodeToken);

module.exports = router;
