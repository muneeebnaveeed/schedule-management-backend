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
    assignManager,
    remove,
} = require('../controllers/adminUsers.controller');
const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.route('/register').post(registerUser);
router.route('/id/:id').delete(remove);
router.route('/login').post(loginUser);
router.post('/invite-managers/admin-id/id/:adminid/manager-email/:emails', protect, inviteManagers);
router.post('/import-employees/admin-id/id/:adminid', upload.single('file'), protect, importEmployees);
router.get('/', autoParams, protect, getAll);
router.post('/decode/token/:token', decodeToken);
router.post('/assign/manager/:managerid', protect, assignManager);

module.exports = router;
