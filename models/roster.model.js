const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    admin: { type: mongoose.Types.ObjectId, ref: 'AdminUser' },
    manager: { type: mongoose.Types.ObjectId, ref: 'User' },
    entries: {
        type: Array,
        required: [true, 'Roster entries are required'],
    },
    createdAt: Date,
});

const Model = mongoose.model('Roster', schema);

module.exports = Model;
