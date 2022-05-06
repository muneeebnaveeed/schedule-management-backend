const router = require('express').Router();

const {
    getAll,
    addOne,
    getOne,
    edit,
    remove,
    getAllByManager,
    getUnpaginated,
} = require('../controllers/locations.controller');
const { authentication, authorization } = require('../middlewares/auth.middleware');
const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.get('/', autoParams, protect('ADMIN'), getAll);
router.get('/all', authentication, authorization('ADMIN'), getUnpaginated);

router.get('/manager', protect('MANAGER'), getAllByManager);
router.post('/', protect('ADMIN'), addOne);
router.get('/id/:id', protect('ADMIN'), getOne);
router.patch('/id/:id', protect('ADMIN'), edit);
router.delete('/id/:id', protect('ADMIN'), remove);

module.exports = router;
