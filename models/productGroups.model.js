const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const mongoosePaginate = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter product group name'],
        minLength: [1, 'Minimum of 1 character is required'],
        maxLength: [25, 'Maximum of 25 characters are allowed'],
        unique: true,
        sparse: true,
        uniqueCaseInsensitive: true,
    },
    color: {
        type: String,
        required: [true, 'Please pick a color for group'],
        length: [7, 'Length of 7 characters are required'],
        unique: true,
        sparse: true,
    },
    description: {
        type: String,
        maxLength: [255, 'Maximum of 255 characters are allowed'],
    },
    createdAt: { type: Date, required: true, default: Date.now() },
});
schema.plugin(mongoosePaginate);
schema.plugin(uniqueValidator, { message: 'Product Group with the {PATH} of {VALUE} already exists' });

const Model = mongoose.model('ProductGroup', schema);

module.exports = Model;
