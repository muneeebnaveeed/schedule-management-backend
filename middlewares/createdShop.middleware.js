const mongoose = require('mongoose');
const { promisify } = require('util');
const { catchAsync } = require('../controllers/errors.controller');
const AppError = require('../utils/AppError');

module.exports.restrictToShop = catchAsync(async function (req, res, next) {
    if (req.headers.shop) {
        if (req.headers.shop === 'dev') return next();

        if (!mongoose.isValidObjectId(req.headers.shop)) return next(new AppError('Invalid Shop ID', 400));

        const shop = await mongoose.model('Shop').findById(req.headers.shop).lean();
        if (!shop) return next(new AppError('Shop does not exist', 404));
        res.locals.shop = shop;
        return next();
    }

    return next(new AppError('Please enter shop', 400));
});
