const router = require('express').Router();
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { loginUser, registerUser, inviteManagers, importEmployees } = require('../controllers/adminUsers.controller');

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.post('/invite-managers/admin-id/id/:adminid/manager-email/:emails', inviteManagers);
router.post('/import-employees/admin-id/id/:adminid', upload.single('file'), importEmployees);
// router.get('/', getAll);

module.exports = router;
