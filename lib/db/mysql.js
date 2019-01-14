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
        this.closeCalled = false;
    }

    /**
     * Create or return a previous open connection.
     *
     * @returns {boolean}
     */
    connect() {
        let config = {
            host: this.config.dbHost || 'localhost',
            port: this.config.dbPort || 3306,
            user: this.config.dbUser,
            password: this.config.dbPass,
            database: this.config.dbName,
            connectionLimit: 50,
            dateStrings: true,
            timezone: 'UTC',
            supportBigNumbers: true
        };

        return new Promise( (res, rej) => {
            let conn = mysql.createConnection(config);

            conn.connect(err => {
                if ( err ) {
                    rej(err);
                }

                res(conn);
            });
        });
    }

    /**
     * Check database connection.
     *
     * @returns {Promise<any>}
     */
    checkConnection() {
        return this.connect()
            .then( conn => {
                conn.end();

                return true;
            });
    }

    execQuery(tableName) {
        tableName = this.prefix + tableName;

        return new Query( this, tableName );
    }
}
module.exports = MySQL;