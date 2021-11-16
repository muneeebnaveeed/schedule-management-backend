const router = require('express').Router();

const { register, approve, loginUser, getUsers, remove } = require('../controllers/managerUsers.controller');

router.post('/register', register);
router.post('/approve', approve);
router.post('/login', loginUser);
router.get('/', getUsers);
router.delete('/id/:id', remove);

module.exports = router;
