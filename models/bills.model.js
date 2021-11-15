const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');
// const { productSchema } = require('./products.model');

const schema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['WALKIN', 'NORMAL', 'VIP', 'REFUND'],
        required: [true, 'Please enter type'],
    },
    products: {
        type: [
            {
                _id: { type: mongoose.Schema.ObjectId, required: [true] },
                registeredGroupId: { type: Object },
                name: {
                    type: String,
                    required: [true, 'Please enter product name'],
                    maxlength: [255, 'Only 255 characters are allowed in title'],
                },
                salePrice: {
                    type: Number,
                    required: [true, 'Please enter sale price'],
                },
                costPrice: {
                    type: Number,
                    required: [true, 'Please enter cost price'],
                },
                amount: { type: Number, required: [true, 'Amount is required'] },
                qty: { type: Number, required: [true, 'Please enter quantity'] },
            },
        ],
    },
    customer: {
        _id: { type: mongoose.Schema.ObjectId },
        name: {
            type: String,
            maxlength: [255, 'Only 255 characters are allowed in name'],
        },
        phone: {
            type: String,
            maxlength: [20, 'Maximum 20 characters are allowed in name'],
        },
        balance: {
            type: Number,
        },
    },
    subTotal: Number,
    discountPercent: Number,
    discountAmount: Number,
    total: Number,
    vipConsumed: Number,
    remainingPay: Number,
    createdAt: { type: Date, required: true, default: Date.now() },
    createdShop: {
        type: mongoose.Types.ObjectId,
        ref: 'Shop',
        required: [true, 'Please enter shop'],
    },
    billId: String,
});

schema.plugin(mongoosePagiante);

const Model = mongoose.model('Bill', schema);

module.exports = Model;
