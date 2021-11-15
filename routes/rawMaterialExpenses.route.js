const router = require('express').Router();

const { getAll, getAllCSV, addOne, addMany, edit, remove } = require('../controllers/rawMaterialExpenses.controller');
const { restrictToShop } = require('../middlewares/createdShop.middleware');
const autoParams = require('../utils/autoParams');

router.get('/', restrictToShop, autoParams, getAll);
router.get('/get-csv', restrictToShop, autoParams, getAllCSV);
router.post('/', restrictToShop, addOne);
router.patch('/id/:id', restrictToShop, edit);
router.route('/id/:id').delete(remove);

module.exports = router;
