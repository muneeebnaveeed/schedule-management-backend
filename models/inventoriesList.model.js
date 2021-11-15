const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');
const mongooseAggregatePaginate = require('mongoose-aggregate-paginate-v2');
const uniqueValidator = require('mongoose-unique-validator');

const schema = new mongoose.Schema({
    item: {
        type: String,
        required: [true, 'Please enter a title'],
        maxlength: [35, 'Only 35 characters are allowed in title'],
        unique: true,
    },
    quantity: { type: Number, required: [true, 'Please enter a quantity'] },
});

schema.plugin(mongoosePagiante);
schema.plugin(mongooseAggregatePaginate);
schema.plugin(uniqueValidator, { message: 'Item with the {PATH} of {VALUE} already exists' });
const Model = mongoose.model('InventoryList', schema);

module.exports = Model;
