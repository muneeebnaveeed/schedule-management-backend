const mongoose = require('mongoose');
const mongoosePagiante = require('mongoose-paginate-v2');

const shiftSchema = {
    in: { type: Date, required: [true, 'Punch in time is required'] },
    out: { type: Date, required: [true, 'Punch in time is required'] },
};

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter a name for the schedule'],
    },
    colorCode: {
        type: String,
        required: [true, 'Please assign a color to the schedule'],
    },
    Monday: shiftSchema,
    Tuesday: shiftSchema,
    Wednesday: shiftSchema,
    Thursday: shiftSchema,
    Friday: shiftSchema,
    Saturday: shiftSchema,
    Sunday: shiftSchema,
});

schema.plugin(mongoosePagiante);
const Model = mongoose.model('Schedule', schema);

module.exports = Model;
