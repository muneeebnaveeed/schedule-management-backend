const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const mongoosePagiante = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter a name'],
        maxlength: [25, 'Only 25 characters are allowed in location name'],
        unique: true,
        uniqueCaseInsensitive: true,
    },
    coordinates: {
        type: {
            lat: {
                type: Number,
                required: [true, 'Latitude is required'],
            },
            long: {
                type: Number,
                required: [true, 'Longitude is required'],
            },
        },
        required: [true, 'Coordinates are required'],
    },
    admin: {
        type: mongoose.Types.ObjectId,
        ref: 'AdminUser',
        required: [true, 'Please enter admin'],
    },
    radius: {
        type: Number,
        required: [true, 'Please enter radius is meters'],
    },
    createdAt: { type: Date, required: true, default: Date.now() },
});

schema.plugin(mongoosePagiante);
schema.plugin(uniqueValidator, { message: 'Location with the {PATH} of {VALUE} already exists' });

const Model = mongoose.model('Location', schema);

module.exports = Model;
