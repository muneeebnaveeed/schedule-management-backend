const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    createdAt: { type: Date, required: true, default: Date.now() },
    expenseName: {
        type: String,
        required: [true, 'Please enter expense name'],
        minlength: [4, 'Please enter a bare minimum of 4 characters in expense name'],
        maxlength: [255, 'Only 255 characters are allowed in expense name'],
    },
    price: {
        type: Number,
        required: [true, 'Please enter price'],
    },
    detail: {
        type: String,
        maxlength: [255, 'Only 255 characters are allowed in detail'],
    },
    createdShop: {
        type: mongoose.Types.ObjectId,
        ref: 'Shop',
        required: [true, 'Please enter shop'],
    },
});

schema.plugin(mongoosePagiante);

const Model = mongoose.model('ShopExpenses', schema);

module.exports = Model;
