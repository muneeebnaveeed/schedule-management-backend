const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter a name'],
        maxlength: [25, 'Only 25 characters are allowed in shop address'],
    },
    coordinates: {
        type: {
            lat: {
                type: Number,
                required: [1, 'Latitude is required'],
            },
            long: {
                type: Number,
                required: [1, 'Latitude is required'],
            },
        },
        required: [1, 'Coordinates are required'],
    },

    createdAt: { type: Date, required: true, default: Date.now() },
});

schema.plugin(mongoosePagiante);

const Model = mongoose.model('Location', schema);

module.exports = Model;
