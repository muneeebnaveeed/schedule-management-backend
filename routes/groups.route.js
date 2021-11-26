const router = require('express').Router();

const { addOne, getOne, getAll, remove, edit } = require('../controllers/groups.controller');

router.post('/', addOne);
router.get('/id/:id', getOne);
router.get('/', getAll);
router.delete('/ids/:ids', remove);
router.patch('/id/:id', edit);

module.exports = router;
