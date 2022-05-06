const _ = require('lodash');

class Utils {
    static getPaginatedResults(data) {
        return _.pick(data, ['docs', 'totalDocs', 'hasPrevPage', 'hasNextPage', 'totalPages', 'pagingCounter']);
    }
}

module.exports = Utils;
