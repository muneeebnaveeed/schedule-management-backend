const router = require('express').Router();
const { authentication, authorization } = require('../middlewares/auth.middleware');
const { getAll, getAllTagsAndUntaggedUsers } = require('../controllers/users.controller');
const autoParams = require('../utils/autoParams');

router.get('/', autoParams, authentication, authorization('ADMIN', 'MANAGER'), getAll);
router.get(
    '/tags-and-untagged-users',
    autoParams,
    authentication,
    authorization('ADMIN', 'MANAGER'),
    getAllTagsAndUntaggedUsers
);

module.exports = router;
