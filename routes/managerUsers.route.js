const router = require('express').Router();

const { register, loginUser, getUsers, remove } = require('../controllers/managerUsers.controller');

router.post('/register', register);
router.post('/login', loginUser);
router.get('/', getUsers);
router.delete('/id/:id', remove);

module.exports = router;
