const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');

const shiftSchema = {
    in: String,
    out: String,
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
});

schema.plugin(mongoosePagiante);
const Model = mongoose.model('Schedule', schema);

module.exports = Model;
