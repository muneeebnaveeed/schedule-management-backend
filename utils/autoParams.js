const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

module.exports = function (req, res, next) {
    req.query.page = req.query.page ? parseInt(req.query.page) : 1;
    req.query.limit = req.query.limit ? parseInt(req.query.limit) : 5;
    req.query.search = req.query.search ?? '';
    req.query.sort = req.query.sort ? JSON.parse(req.query.sort) : { _id: 1 };

    const { startDate, endDate } = req.query;
    let dateToBeConverted = null;

    if (startDate) dateToBeConverted = startDate;
    else dateToBeConverted = new Date();

    req.query.startDate = dayjs(dateToBeConverted).utcOffset(0).startOf('date').toDate();

    if (endDate) dateToBeConverted = endDate;
    else dateToBeConverted = new Date();

    req.query.endDate = dayjs(dateToBeConverted).utcOffset(0).endOf('date').toDate();

    next();
};
