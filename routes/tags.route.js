const router = require('express').Router();

const { addOne, getOne, getAll, remove, edit } = require('../controllers/tags.controller');
const autoParams = require('../utils/autoParams');

router.get('/', autoParams, getAll);
router.post('/', addOne);
router.delete('/id/:ids', remove);
router.patch('/id/:id', edit);

module.exports = router;
