'use strict';

const mysql = require('mysql'),
    Query = require('./mysql-query'),
    _ = require('underscore');

class MySQL {
    constructor(config) {
        this.config = config;
        this.prefix = config.prefix || 'cjs_';
        this.type = 'mysql';
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
            //return this.__close();
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

    execQuery(tableName) {
        tableName = this.prefix + tableName;

        return new Query( this, tableName );
    }
}
module.exports = MySQL;