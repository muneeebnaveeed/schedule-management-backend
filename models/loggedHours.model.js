const mongoose = require('mongoose');
const dayjs = require('dayjs');
const uniqueValidator = require('mongoose-unique-validator');

const schema = new mongoose.Schema({
    month: {
        type: String,
        default: dayjs().format('M-YYYY'),
        required: true,
    },
    employee: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
    },
    createdAt: { type: Date, required: true, default: Date.now() },
    logs: {
        type: Object,
        required: [true, 'Logs are required'],
    },
    lastIn: Date,
    lastOut: Date,
});
schema.plugin(uniqueValidator, { message: 'User with the {PATH} of {VALUE} already exists' });

const Model = mongoose.model('LoggedHour', schema);

module.exports = Model;
