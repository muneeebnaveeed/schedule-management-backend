const router = require('express').Router();

const autoParams = require('../utils/autoParams');
const {
    getAll,
    getOne,
    addOne,
    vipBill,
    refundBill,
    remove,
    edit,
    pay,
    addMany,
    getTransactions,
} = require('../controllers/bills.controller');
const { restrictToShop } = require('../middlewares/createdShop.middleware');

router.get('/', autoParams, getAll);
router.get('/id/:id', autoParams, getOne);
router.get('/transactions', autoParams, getTransactions);
router.post('/', restrictToShop, addOne);
router.post('/vip', restrictToShop, vipBill);
router.post('/refund/:id', restrictToShop, refundBill);
router.patch('/id/:id', restrictToShop, edit);
router.route('/id/:id').delete(remove);

module.exports = router;
