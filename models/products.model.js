const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');

const productSchema = {
    registeredGroupId: {
        type: mongoose.Types.ObjectId,
        ref: 'ProductGroup',
        required: [true, 'Product group is required'],
    },
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
    description: {
        type: String,
    },

    // createdBy: { type: mongoose.ObjectId, ref: 'User', select: false },
    createdAt: { type: Date, required: true, default: Date.now() },
};

const schema = new mongoose.Schema(productSchema);
schema.plugin(mongoosePagiante);
const Model = mongoose.model('Product', schema);

module.exports = { Model, productSchema };
