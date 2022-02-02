const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const uniqueValidator = require('mongoose-unique-validator');
const mongoosePagiante = require('mongoose-paginate-v2');
require('mongoose-type-email');

// mongoose.SchemaTypes.Email.defaults.message = 'Email address is invalid';

const schema = new mongoose.Schema({
    email: {
        type: mongoose.SchemaTypes.Email,
        unique: true,
        lowercase: true,
        required: [true, 'Please enter email address'],
    },
    name: {
        type: String,
        required: [true, 'Please enter a name'],
        maxLength: [25, 'Maximum of 25 characters are allowed'],
    },
    password: {
        type: String,
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
    maxNoOfManagers: {
        type: Number,
        default: 2
    },
    maxNoOfEmployees: {
        type: Number,
        default: 25
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

const Model = mongoose.model('AdminUser', schema);

module.exports = Model;
