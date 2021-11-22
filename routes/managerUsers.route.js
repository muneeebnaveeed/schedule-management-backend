const router = require('express').Router();

const {
    register,
    approveUser,
    approveManager,
    loginUser,
    getUsers,
    remove,
} = require('../controllers/managerUsers.controller');

router.post('/register', register);
router.post('/approve-user', approveUser);
router.post('/approve-manager', approveManager);
router.post('/login', loginUser);
router.get('/', getUsers);
router.delete('/id/:id', remove);

module.exports = router;
