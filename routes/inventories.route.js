const router = require('express').Router();

const autoParams = require('../utils/autoParams');
const {
    getAll,
    addOne,
    remove,
    removeInventory,
    edit,
    pay,
    addMany,
    getTransactions,
    getInventoryCSV,
    getTransactionsCSV,
} = require('../controllers/inventories.controller');
const { restrictToShop } = require('../middlewares/createdShop.middleware');

router.get('/', getAll);
router.get('/inventory/get-csv', getInventoryCSV);
router.get('/transactions/:type', autoParams, restrictToShop, getTransactions);
router.get('/transactions/:type/get-csv', autoParams, restrictToShop, getTransactionsCSV);
router.post('/', restrictToShop, addOne);
router.patch('/id/:id', restrictToShop, edit);
router.route('/id/:id').delete(remove);
router.route('/inventory-list/id/:id').delete(removeInventory);

module.exports = router;
