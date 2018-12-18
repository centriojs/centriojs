'use strict';

const MySQL = require('./db/mysql'),
    MongoDB = require('./db/mongodb');

const exp = module.exports = {};

/**
 * Return an instance of database class base on the type of database use.
 *
 * @param {object} config
 * @returns {object} Returns an instance of database connection.
 */
exp.DatabaseManager = config => {

    switch( config.database ) {
        default :
            return new MySQL(config);

        case 'mongodb' :
            return new MongoDB(config);
    }
};