'use strict';

const MongoClient = require('mongodb').MongoClient,
    Query = require('./mongodb-query'),
    path = require('path'),
    fs = require('fs'),
    _ = require('../mixin');

class MongoDB {
    constructor(config) {
        this.config = _.extend( {
            dbHost: 'localhost',
            dbPort: 27017,
            prefix: config.prefix || 'cjs_'
        }, config );

        this.conn = false;
    }

    options() {
        return {
            authMechanism: this.config.authMechanism || 'DEFAULT',
            useNewUrlParser:   true,
            autoReconnect:     true,
            reconnectTries:    Number.MAX_VALUE,
            reconnectInterval: 500,
            poolSize:          10,
            bufferMaxEntries:  0,
            connectTimeoutMS:  10000,
            socketTimeoutMS:   50000
        };
    }

    getHost() {

        let host = 'mongodb://';

        if ( this.config.dbUser && this.config.dbPass ) {
            host += `${encodeURIComponent(this.config.dbUser)}:${encodeURIComponent(this.config.dbPass)}`;
            host += '@' + this.config.dbHost;
        } else {
            host += this.config.dbHost;
        }

        if ( this.config.dbPort ) {
            host += ':' + this.config.dbPort;
        }

        console.log(host);

        return host;
    }

    connect() {
        if ( this.conn ) {
            return this.conn;
        }

        this.conn = new MongoClient( this.getHost(), this.options() );

        return this.conn;
    }

    checkConnection() {
        return new Promise( (res, rej) => {
            this.connect().connect( (err, client) => {
                if (err) {
                    return rej(err);
                }

                client.close();

                return res(client);
            });
        });
    }

    /**
     * Returns an instance of query class that provide access to execute database query.
     *
     * @param {string} tableName        The collection/table name to execute any query to without predefined prefix.
     * @returns {Promise<any>}
     */
    execQuery(tableName) {
        tableName = this.config.prefix + tableName;

        return new Promise( (res, rej) => {
            this.connect().connect( (err, client) => {
                if ( err ) {
                    return rej(err);
                }

                let db = client.db( this.config.dbName );

                res(new Query(db, client, tableName));
            });
        });
    }
}
module.exports = MongoDB;