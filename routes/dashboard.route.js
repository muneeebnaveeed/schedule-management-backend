const router = require('express').Router();

const {
    getDashboard
} = require('../controllers/dashboard.controller');

const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.get('/', protect('ADMIN'), getDashboard);

module.exports = router;
