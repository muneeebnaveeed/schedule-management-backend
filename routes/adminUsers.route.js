const router = require('express').Router();
const multer = require('multer');
const { authentication, authorization } = require('../middlewares/auth.middleware');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const {
    getAll,
    loginUser,
    inviteManagers,
    importEmployees,
    getSampleFile,
    decodeToken,
    assignManager,
    remove,
} = require('../controllers/adminUsers.controller');
const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.route('/id/:id').delete(remove);
router.route('/login').post(loginUser);
router.post('/invite-managers/admin-id/id/:adminid/manager-email/:emails', protect('ADMIN'), inviteManagers);
router.post('/import-employees/admin-id/id/:adminid', upload.single('file'), protect('ADMIN'), importEmployees);
router.get('/get-sample-file', getSampleFile);
router.get('/', autoParams, authentication, authorization('ADMIN', 'MANAGER'), getAll);
router.post('/decode/token/:token', decodeToken);
router.post('/assign/manager/:managerid', protect('ADMIN'), assignManager);

module.exports = router;
