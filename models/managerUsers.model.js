const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const uniqueValidator = require('mongoose-unique-validator');

const mongoosePagiante = require('mongoose-paginate-v2');

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter a name'],
        maxlength: [255, 'Only 255 characters are allowed in name'],
    },
    username: {
        type: String,
        required: [true, 'Please enter username'],
        maxlength: [20, 'Only 20 characters are allowed in username'],
        unique: true,
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
    location: {
        type: mongoose.Types.ObjectId,
        ref: 'Location',
    },
    admin: {
        type: mongoose.Types.ObjectId,
        ref: 'AdminUser',
    },
    isConfirmed: {
        type: Boolean,
        required: [false, 'isConfirm is required'],
        default: false,
    },
    createdAt: { type: Date, required: true, default: Date.now() },
});

schema.plugin(mongoosePagiante);
schema.plugin(uniqueValidator, { message: 'Manager with the {PATH} of {VALUE} already exists' });
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

schema.methods.changedPasswordAfter = function (timestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return timestamp < changedTimestamp;
    }

    // FALSE = PASSWORD NOT CHANGED
    return false;
};
const Model = mongoose.model('ManagerUser', schema);

module.exports = Model;
