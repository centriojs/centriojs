'use strict';

require('../../lib/load');

const {DatabaseManager} = require('../../lib/db');

let config = {
    database: 'mysql',
    dbName: 'centriojs_test',
    dbUser: 'root',
    dbPass: 'root',
    prefix: 'cjms_'
};

global.dbManager = DatabaseManager(config);