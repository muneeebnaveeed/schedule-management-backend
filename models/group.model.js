const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const mongoosePagiante = require('mongoose-paginate-v2');
require('mongoose-type-email');

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter a name'],
        unique: true,
    },
    createdAt: { type: Date, required: true, default: Date.now() },
});
schema.plugin(mongoosePagiante);
schema.plugin(uniqueValidator, { message: 'User with the {PATH} of {VALUE} already exists' });

const Model = mongoose.model('Group', schema);

module.exports = Model;
