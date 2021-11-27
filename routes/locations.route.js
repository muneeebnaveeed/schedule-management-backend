const router = require('express').Router();

const { getAll, addOne, getOne, edit, remove } = require('../controllers/locations.controller');
const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.get('/', autoParams, getAll);
router.post('/', protect, addOne);
router.route('/id/:id').get(getOne);
router.route('/id/:id').patch(edit);
router.route('/id/:id').delete(remove);

module.exports = router;
