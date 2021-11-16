const mongoose = require('mongoose');

module.exports = class Database {
    constructor() {
        console.log('Created instance of DB');
        this.authString = process.env.DB_CONNECTION_STRING;
    }

    connect() {
        console.log('Connecting to DB...');
        return mongoose.connect(this.authString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
        });
    }
};
