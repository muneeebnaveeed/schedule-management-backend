const router = require('express').Router();

const { getAll, getAllCSV, addOne, addMany, edit, remove } = require('../controllers/vipCustomers.controller');
const { restrictToShop } = require('../middlewares/createdShop.middleware');

router.get('/', restrictToShop, getAll);
router.get('/get-csv', restrictToShop, getAllCSV);
router.post('/', restrictToShop, addOne);
router.patch('/id/:id', restrictToShop, edit);
router.route('/id/:id').delete(remove);

module.exports = router;
