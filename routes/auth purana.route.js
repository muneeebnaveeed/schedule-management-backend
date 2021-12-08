const router = require('express').Router();

const {
    getUsers,
    loginUser,
    registerUser,
    confirmUser,
    editUser,
    protect,
    decodeToken,
    remove,
} = require('../controllers/auth.controller');
const { restrictToShop } = require('../middlewares/createdShop.middleware');
const autoParams = require('../utils/autoParams');

router.get('/', autoParams, getUsers);
router.get('/decode/:token', decodeToken);
router.put('/confirm/:id/:role', restrictToShop, confirmUser);
// router.put('/:id', protect, editUser);
router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/id/:id').delete(remove);

module.exports = router;
