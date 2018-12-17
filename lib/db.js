'use strict';

const MySQL = require('./db/mysql');

let useDB, DB;

const exp = module.exports = {};

/**
 * Return an instance of database class base on the type of database use.
 *
 * @param config
 * @returns {*}
 */
exp.dbManager = config => {
    // Ensure that only 1 instance of database connection is use.
    if ( DB && useDB === config.database ) {
        return DB;
    }

    useDB = config.database;

    if ( 'mysql' === useDB ) {
         DB = new MySQL(config);
    }

    return DB;
};