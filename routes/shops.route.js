const router = require('express').Router();

const { getAll, addOne, addMany, edit, remove } = require('../controllers/shops.controller');

router.route('/').get(getAll);
router.route('/').post(addOne);
// router.route('/many').post(addMany);
router.route('/id/:id').patch(edit);
router.route('/id/:id').delete(remove);

module.exports = router;
