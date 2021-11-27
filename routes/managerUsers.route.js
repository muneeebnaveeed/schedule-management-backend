const router = require('express').Router();

const {
    register,
    approveUser,
    approveManager,
    loginUser,
    getUsers,
    remove,
    editUser,
    decodeToken,
} = require('../controllers/managerUsers.controller');
const { protect } = require('../middlewares/protect.middleware');

router.post('/register', register);
router.post('/decode/token/:token', decodeToken);
router.post('/approve-user', approveUser);
router.post('/approve-manager', approveManager);
router.post('/login', loginUser);
router.get('/', getUsers);
// router.delete('/id/:id', remove);
router.patch('/id/:id', editUser);

module.exports = router;
