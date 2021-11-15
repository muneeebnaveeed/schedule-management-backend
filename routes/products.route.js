const router = require('express').Router();

const { getAll, getbyGroups, addOne, edit, remove } = require('../controllers/products.controller');

router.route('/groups').get(getbyGroups);
router.route('/').get(getAll);
router.route('/').post(addOne);
// router.route('/many').post(addMany);
router.route('/id/:id').patch(edit);
router.route('/id/:id').delete(remove);

module.exports = router;
