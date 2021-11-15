const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');
const mongooseAggregatePaginate = require('mongoose-aggregate-paginate-v2');

const schema = new mongoose.Schema({
    item: {
        type: String,
        required: [true, 'Please enter a title'],
        maxlength: [35, 'Only 35 characters are allowed in title'],
    },
    quantity: { type: Number, required: [true, 'Please enter a quantity'] },
    description: {
        type: String,
        maxlength: [255, 'Only 255 characters are allowed in description'],
    },
    createdAt: { type: Date, required: true, default: Date.now() },
});

schema.plugin(mongoosePagiante);
schema.plugin(mongooseAggregatePaginate);

const Model = mongoose.model('Inventory', schema);

module.exports = Model;
