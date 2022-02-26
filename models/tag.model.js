const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const mongoosePagiante = require('mongoose-paginate-v2');
require('mongoose-type-email');

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter a name'],
    },
    createdAt: { type: Date, required: true, default: Date.now() },
    manager: { type: mongoose.Types.ObjectId, ref: 'User' },
});
schema.plugin(mongoosePagiante);
schema.plugin(uniqueValidator, { message: 'Tag with the {PATH} of {VALUE} already exists' });

const Model = mongoose.model('Tag', schema);

module.exports = Model;
