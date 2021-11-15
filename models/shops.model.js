const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    address: {
        type: String,
        required: [true, 'Please enter shop address'],
        minlength: [4, 'Please enter a bare minimum of 4 characters in shop address'],
        maxlength: [255, 'Only 255 characters are allowed in shop address'],
    },
    phone: {
        type: String,
        required: [true, 'Please enter a phone number'],
        minlength: [12, 'Please enter a bare minimum of 12 characters in phone number'],
        maxlength: [25, 'Only 25 characters are allowed as phone number'],
    },
    // balance: {
    //     type: Number,
    //     required: [true, 'Please Enter balance'],
    // },
    // createdBy: { type: mongoose.ObjectId, ref: 'User', select: false },
    createdAt: { type: Date, required: true, default: Date.now() },
    // createdShop: {
    //     type: String,
    //     required: [true, 'Please enter shop address'],
    //     maxlength: [255, 'Only 255 characters are allowed in shop'],
    // },
});

schema.plugin(mongoosePagiante);

const Model = mongoose.model('Shop', schema);

module.exports = Model;
