const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter a name'],
        maxlength: [255, 'Only 255 characters are allowed in name'],
    },
    phone: {
        type: String,
        maxlength: [20, 'Maximum 20 characters are allowed in phone'],
    },
    balance: {
        type: Number,
        required: [true, 'Please Enter balance'],
    },
    // createdBy: { type: mongoose.ObjectId, ref: 'User', select: false },
    createdAt: { type: Date, required: true, default: Date.now() },
    createdShop: {
        type: mongoose.Types.ObjectId,
        ref: 'Shop',
        required: [true, 'Please enter shop'],
    },
});

schema.plugin(mongoosePagiante);

const Model = mongoose.model('VipCustomer', schema);

module.exports = Model;
