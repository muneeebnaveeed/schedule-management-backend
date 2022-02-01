const _ = require('lodash');
const AppError = require('../utils/AppError');

function getCastError(err) {
    return err;
}
function getValidationError(err) {
    const errors = Object.values(err.errors).map((el) => {
        let { message } = el;
        if (message.includes('Cast to ObjectId failed')) message = 'Invalid id(s)';
        return message;
    });
    return new AppError(errors, 400);
}

function getDevelopmentError(err) {
    return {
        status: err.status,
        data: err.message,
        error: _.omit(err, ['stack']),
        stack: err.stack,
    };
}

function getProductionError(err) {
    return {
        status: err.status,
        data: err.message,
    };
}

module.exports.catchAsync = function (fn) {
    return function (req, res, next) {
        fn(req, res, next).catch((err) => next(err));
    };
};

module.exports.errorController = function (err, req, res, next) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    let error = { ...err, name: err.name, stack: err.stack, message: err.message };

    if (error.name === 'CastError') error = getCastError(error);
    if (error.name === 'ValidationError') error = getValidationError(error);

    if (process.env.NODE_ENV === 'development') {
        const devError = getDevelopmentError(error);
        console.log(devError);
        return res.status(error.statusCode).json(devError);
    }

    const prodError = getProductionError(error);
    return res.status(err.statusCode).json(prodError);
};
