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
exp.dbManager = config => {

    switch( config.database ) {
        default :
            return new MySQL(config);

        case 'mongodb' :
            return new MongoDB(config);
    }
};

/**
 * Create database table if it doesn't exist.
 *
 * @param args {
 *     @param {string} $name                The table name without predefine prefix.
 *     @param {object} $columns {           The table's column structure where the key is the column name and value are the column structure
 *         @param {string} $type            The column type, example: BIGINT, INT, VARCHAR
 *         @param {int} $length             Required if the column structure requires length such as BIGINT, INT, VARCHAR.
 *         @param {array} $enum             An array of enumerable value if `ENUM` if the column type.
 *         @param {boolean} $primary        If true, will make the column as it's primary table column.
 *         @param {boolean} $index          Whether the column will be index
 *         @param {boolean} $increment      Whether to increment the value of this column.
 *         @param {boolean} $signed         Whether to signed the inserted value of the column. Use in an integer or float column type.
 *         @param {boolean} $unsigned       Whether to unsigned the inserted value of the column. Use in an integer or float column type.
 *         @param {string|int} $default     The default value to use if no value specified. Also use for setting database date, datetime or timestamp.
 *     }
 *     @param {string} $charset             The charset use to create the table.
 *     @param {string} $engine              The type of table engine to use when creating the table. Default is `InnoDB` for MySQL database type.
 * }
 * @returns {*}
 */
exp.createDBTable = args => {
    let {name, columns} = args;

    if ( ! DB ) {
        return reject( il8n('No active database connection.') );
    }

    if ( ! name ) {
        return reject( il8n('No table name.') );
    }

    if ( ! columns ) {
        return reject( il8n('No table columns.') );
    }

    return DB.createTable(args);
};