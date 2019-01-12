'use strict';

const path = require('path');

global.ABSPATH = path.resolve( __dirname, '../../../demo/app-mysql');

require('../../lib/load');

const {DatabaseManager} = require('../../lib/db');

let config = {
    database: 'mongodb',
    dbName: 'centriojs_test',
    prefix: 'cjms_'
};

global.dbManager = DatabaseManager(config);