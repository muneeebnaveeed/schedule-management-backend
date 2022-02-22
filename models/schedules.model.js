const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');

const shiftSchema = {
    in: Date,
    out: Date,
};

const schema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please enter a name for the schedule'],
    },
    color: {
        type: String,
        required: [true, 'Please assign a color to the schedule'],
    },
    shiftTimes: {
        Monday: shiftSchema,
        Tuesday: shiftSchema,
        Wednesday: shiftSchema,
        Thursday: shiftSchema,
        Friday: shiftSchema,
        Saturday: shiftSchema,
        Sunday: shiftSchema,
    },
    manager: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please enter manager'],
    }
});

schema.plugin(mongoosePagiante);
const Model = mongoose.model('Schedule', schema);

module.exports = Model;
