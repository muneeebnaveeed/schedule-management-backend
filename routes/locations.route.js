const router = require('express').Router();

const { getAll, addOne, getOne, edit, remove } = require('../controllers/locations.controller');
const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.get('/', autoParams, protect('ADMIN'), getAll);
router.post('/', protect('ADMIN'), addOne);
router.get('/id/:id', protect('ADMIN'), getOne);
router.patch('/id/:id', protect('ADMIN'), edit);
router.delete('/id/:id', protect('ADMIN'), remove);

module.exports = router;
