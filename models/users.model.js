const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const uniqueValidator = require('mongoose-unique-validator');
// const Product = require('./productsModel');
const mongoosePagiante = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter a name'],
        maxLength: [25, 'Maximum of 25 characters are allowed'],
        unique: true,
        sparse: true,
        uniqueCaseInsensitive: true,
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
    passwordChangedAt: Date,
    role: {
        type: String,
        enum: { values: ['MANAGER', 'ADMINISTRATOR'], message: 'Invalid role' },
    },
    isConfirmed: {
        type: Boolean,
        required: [false, 'isConfirm is required'],
        default: false,
    },
    // products: { type: [Product.schema], required: true, default: [] },
    createdAt: { type: Date, required: true, default: Date.now() },
    createdShop: {
        type: mongoose.Types.ObjectId,
        ref: 'Shop',
    },
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

    console.log(this.passwordConfirm);
    next();
});

schema.methods.isValidPassword = async function (password, encryptedPassword) {
    const isValid = await bcrypt.compare(password, encryptedPassword);
    return isValid;
};

schema.methods.changedPasswordAfter = function (timestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return timestamp < changedTimestamp;
    }

    // FALSE = PASSWORD NOT CHANGED
    return false;
};

const Model = mongoose.model('User', schema);

module.exports = Model;
