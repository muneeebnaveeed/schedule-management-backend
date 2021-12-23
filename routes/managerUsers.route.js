const router = require('express').Router();

const {
    approveUser,
    approveManager,
    loginUser,
    getUsers,
    remove,
    editUser,
    decodeToken, getTimeSheet
} = require('../controllers/managerUsers.controller');
const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.post('/decode/token/:token', decodeToken);
router.post('/approve-user', approveUser);
router.post('/approve-manager', approveManager);
router.post('/login', loginUser);
router.get('/', getUsers);
// router.delete('/id/:id', remove);
router.patch('/id/:id', editUser);
router.get('/time-sheet', autoParams, protect('MANAGER'), getTimeSheet);

module.exports = router;
