const router = require('express').Router();

const { addOne, getOne, getAll, remove, edit } = require('../controllers/tags.controller');
const autoParams = require('../utils/autoParams');
const { authentication } = require('../middlewares/auth.middleware');

router.get('/', autoParams, authentication, getAll);
router.post('/', authentication, addOne);
router.delete('/id/:ids', remove);
router.patch('/id/:id', edit);

module.exports = router;
