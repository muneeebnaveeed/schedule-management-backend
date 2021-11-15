const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please enter a title'],
        maxLength: [25, 'Maximum of 25 characters are allowed'],
        unique: true,
        sparse: true,
        uniqueCaseInsensitive: true,
    },
    workDays: {
        type: [String],
        required: [1, 'Work days are required'],
    },
    createdAt: { type: Date, required: true, default: Date.now() },
});

schema.plugin(mongoosePagiante);

const Model = mongoose.model('Schedule', schema);

module.exports = Model;
