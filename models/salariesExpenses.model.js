const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    createdAt: { type: Date, required: true, default: Date.now() },
    employeeId: {
        type: mongoose.Types.ObjectId,
        ref: 'Employee',
        required: [true, 'Employee id is required'],
    },
    description: {
        type: String,
        minlength: [4, 'Please enter a bare minimum of 4 characters in description'],
        maxlength: [255, 'Only 255 characters are allowed in description'],
    },
    createdShop: {
        type: mongoose.Types.ObjectId,
        ref: 'Shop',
        required: [true, 'Please enter shop'],
    },
    amount: {
        type: Number,
        required: [true, 'Please enter amount'],
    },
});

schema.plugin(mongoosePagiante);

const Model = mongoose.model('SalariesExpense', schema);

module.exports = Model;
