const jwt = require('jsonwebtoken');

module.exports.signToken = function (payload) {
    const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return token;
};
