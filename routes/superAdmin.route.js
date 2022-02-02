const router = require('express').Router();

const {
    addAdmin, editAdmin, getAdmins, removeAdmins
} = require('../controllers/superAdmin.controller');

const { protect } = require('../middlewares/protect.middleware');
const autoParams = require('../utils/autoParams');

router.post('/', protect('SUPERADMIN'), addAdmin);
router.patch('/adminId/:adminId', protect('SUPERADMIN'), editAdmin)
router.get('/admins', autoParams, protect('SUPERADMIN'), getAdmins)
router.delete('/admins/:adminIds', protect('SUPERADMIN'), removeAdmins)

module.exports = router;
