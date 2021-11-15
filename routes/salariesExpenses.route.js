const router = require('express').Router();

const {
    getAll,
    getAllCSV,
    getSalariesbyEmployeee,
    getSalariesbyEmployeeeCSV,
    addOne,
    addMany,
    edit,
    remove,
} = require('../controllers/salariesExpenses.controller');
const { restrictToShop } = require('../middlewares/createdShop.middleware');
const autoParams = require('../utils/autoParams');

router.get('/employees', restrictToShop, autoParams, getSalariesbyEmployeee);
router.get('/employees/get-csv', restrictToShop, autoParams, getSalariesbyEmployeeeCSV);
router.get('/', restrictToShop, getAll);
router.get('/get-csv', restrictToShop, getAllCSV);
router.post('/', restrictToShop, addOne);
router.patch('/id/:id', restrictToShop, edit);
router.route('/id/:id').delete(remove);

module.exports = router;
