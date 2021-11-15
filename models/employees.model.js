const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');
require('mongoose-type-email');

mongoose.SchemaTypes.Email.defaults.message = 'Email address is invalid';

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter a name'],
        maxlength: [35, 'Only 35 characters are allowed in name'],
    },
    phone: {
        type: String,
        maxlength: [20, 'Maximum 20 characters are allowed in phone'],
    },
    idcard: {
        type: String,
        required: [true, 'Please enter ID Card no.'],
    },
    email: {
        type: mongoose.SchemaTypes.Email,
        allowBlank: true,
    },
    description: {
        type: String,
    },
    salary: {
        type: Number,
        required: [true, 'Please enter salary'],
        min: [1, 'Please enter a valid salary'],
    },
    hireDate: { type: Date, required: [true, 'Please enter hire date'] },
    createdShop: {
        type: mongoose.Types.ObjectId,
        ref: 'Shop',
        required: [true, 'Please enter shop'],
    },
});
schema.index({ name: 'text', phone: 'text' });
schema.plugin(mongoosePagiante);
const Model = mongoose.model('Employee', schema);

module.exports = Model;
