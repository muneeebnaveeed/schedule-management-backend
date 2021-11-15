const router = require('express').Router();

const autoParams = require('../utils/autoParams');
const { getSalesReport, getProfitLossReport } = require('../controllers/audit.controller');
const { restrictToShop } = require('../middlewares/createdShop.middleware');

router.get('/sales-report', autoParams, restrictToShop, getSalesReport);
router.get('/profit-loss-report', autoParams, restrictToShop, getProfitLossReport);

module.exports = router;
