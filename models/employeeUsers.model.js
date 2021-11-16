const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const uniqueValidator = require('mongoose-unique-validator');
const mongoosePagiante = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please enter a username'],
        maxLength: [25, 'Maximum of 25 characters are allowed'],
        unique: true,
        sparse: true,
        uniqueCaseInsensitive: true,
    },
    name: {
        type: String,
        required: [true, 'Please enter a name'],
        maxLength: [25, 'Maximum of 25 characters are allowed'],
    },
    password: {
        type: String,
        select: false,
        required: [true, 'Please enter a password'],
    },
    passwordConfirm: {
        select: false,
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // ONLY WORKS ON CREATE AND SAVE
            validator: function (val) {
                return val === this.password;
            },
            message: "Passwords don't match",
        },
    },
    isConfirmed: {
        type: Boolean,
        required: [false, 'Please confirm your password'],
        default: false,
    },
    manager: {
        type: mongoose.Types.ObjectId,
        ref: 'ManagerUsers',
    },
    schedule: {
        type: mongoose.Types.ObjectId,
        ref: 'Schedule',
    },
    createdAt: { type: Date, required: true, default: Date.now() },
});
schema.plugin(mongoosePagiante);
schema.plugin(uniqueValidator, { message: 'User with the {PATH} of {VALUE} already exists' });
const encryptPassword = async function (password) {
    const encryptedPassword = await bcrypt.hash(password, 8);
    return encryptedPassword;
};

schema.statics.encryptPassword = encryptPassword;

schema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const password = await encryptPassword(this.password);

    this.password = password;
    this.passwordConfirm = undefined;
    next();
});

schema.methods.isValidPassword = async function (password, encryptedPassword) {
    const isValid = await bcrypt.compare(password, encryptedPassword);
    return isValid;
};

const Model = mongoose.model('EmployeeUser', schema);

module.exports = Model;
