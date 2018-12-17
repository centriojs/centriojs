'use strict';

const mysql = require('mysql'),
    Query = require('./mysql-query'),
    _ = require('underscore');

class MySQL {
    constructor(config) {
        this.config = config;
        this.prefix = config.prefix || 'cjs_';
        this.conn = false;
        this.conCount = 0;
        this.conQueue = 0;
    }

    /**
     * Create or return a previous open connection.
     *
     * @returns {boolean}
     */
    connect() {
        if ( this.conn ) {
            return this.conn;
        }

        let config = {
            host: this.config.dbHost || 'localhost',
            port: this.config.dbPort || 3306,
            user: this.config.dbUser,
            password: this.config.dbPass,
            database: this.config.dbName,
            dateStrings: true,
            timezone: 'UTC',
            supportBigNumbers: true
        };

        this.conn = mysql.createPool(config);

        // Listen to connection cycles
        this.conn.on( 'connection', e => this.onConnect(e) );
        this.conn.on( 'release', e => this.onRelease(e) );
        this.conn.on( 'enqueue', e => this.onQueue(e) );

        return this.conn;
    }

    /**
     * Add connection count on connection counter.
     */
    onConnect() {
        this.conCount += 1;

        if ( this.conQueue > 0 ) {
            this.conQueue -= 1;
        }
    }

    /**
     * Remove connection count
     */
    onRelease() {
        this.conCount -= 1;

        if ( ! this.conCount && ! this.conQueue ) {
            return this.__close();
        }
    }

    onQueue() {
        this.conQueue += 1;
    }

    /**
     * Closes database connection.
     *
     * @returns {Promise<any>}
     * @private
     */
    __close() {
        return new Promise( (res, rej) => {
            this.conn.end( err => {
                if ( err ) {
                    rej(err);
                }

                this.conn = false;
                this.conCount = 0;
                this.conQueue = 0;

                res(true);
            });
        });
    }

    /**
     * Close the database connection if there aren't any connection queue left.
     *
     * @returns {*}
     */
    close() {
        if ( ! this.conn || this.conQueue > 0 ) {
            // Avoid fatal error if there aren't any connection established
            return resolve(true);
        }

        return this.__close();
    }

    /**
     * Check database connection.
     *
     * @returns {Promise<any>}
     */
    checkConnection() {
        return new Promise( (res, rej) => {
            this.connect().getConnection( (err, conn) => {
                if ( err ) {
                    return rej(err);
                }

                // Release connection immediately
                conn.release();
                res(true);
            });
        });
    }

    /**
     * Execute database query.
     *
     * @param sql
     * @param format
     * @returns {Promise<any>}
     */
    execQuery( sql, format ) {
        return new Promise( (res, rej) => {
            this.connect().query( sql, format, (err, results) => {
                if(err) {
                    return rej(err);
                }

                res(results);
            });
        });
    }

    createTable(args) {
        let {name, columns, charset, engine} = args;
        charset = charset || 'DEFAULT';
        engine = engine || 'InnoDB';

        let structure = [],
            indexes = [];

        _.each( columns, (config, column) => {
            if ( config.index ) {
                indexes.push('`' + column + '`');
            }

            let length = 20,
                cols = [`${column}`];

            switch( config.type ) {
                case 'BIGINT' :
                case 'INT' :
                case 'VARCHAR' :
                case 'CHAR' :
                    length = config.length || length;

                    cols.push( config.type + '(' + length + ')' );

                    break;

                case 'OBJECT' :
                case 'ARRAY' :
                    cols.push('LONGTEXT');
                    break;

                case 'ENUM' :
                    let enums = config.enum;
                    cols.push('ENUM(\'' + enums.join("', '") + '\')');

                    break;

                default :
                    cols.push(config.type);
                    break;
            }

            if ( config.unsigned ) {
                cols.push('UNSIGNED');
            }

            if ( config.signed ) {
                cols.push('SIGNED');
            }

            if ( config.primary ) {
                cols.push('PRIMARY KEY');
            }

            if ( config.required ) {
                cols.push('NOT NULL');
            }

            if ( config.increment ) {
                cols.push('AUTO_INCREMENT');
            }

            if ( config.default ) {

                switch( config.default ) {
                    case 'CURRENT_TIMESTAMP' :
                    case 'DATETIME' :
                    case 'DATE' :
                    case 'TIMESTAMP' :
                        cols.push('DEFAULT ' + config.default);
                        break;

                    default :
                        // Set the rest of default value as string
                        cols.push('DEFAULT `' + config.default + '`');
                        break;
                }
            }

            if ( config.update ) {
                cols.push('ON UPDATE ' + config.update );
            }

            // @todo: Add collate column

            structure.push(cols.join(' '));
        });

        if ( indexes.length ) {
            structure.push(`INDEX (${indexes.join(', ')})`);
        }

        structure = structure.join(',');

        let sql = `CREATE TABLE IF NOT EXISTS ?? (${structure})ENGINE=${engine} CHARSET=${charset}`;

        return this.execQuery( sql, [this.prefix + name] );
    }

    /**
     * Returns an instance of MySQL query.
     *
     * @param {string} $tableName       The name of the table to execute the query to without the predefined prefix.
     *
     * @returns {MySQLQuery}
     */
    query(tableName) {
        return new Query(this, tableName);
    }
}
module.exports = MySQL;