const sgMail = require('@sendgrid/mail');

module.exports = class SendGrid {
    constructor() {
        console.log('Created instance of SendGrid');
        this.apiKey = process.env.SENDGRID_API_KEY;
    }

    setApiKey() {
        console.log('Setting api key of send grid...');
        return sgMail.setApiKey(this.apiKey);
    }
};
