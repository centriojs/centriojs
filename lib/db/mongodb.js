'use strict';

const MongoClient = require('mongodb').MongoClient,
    path = require('path'),
    fs = require('fs'),
    _ = require('../mixin');

class MongoDB {
    constructor(config) {
        this.config = _.extend( {
            dbHost: 'localhost',
            dbPort: 27017
        }, config );

        this.conn = false;
        this.conCount = 0;
    }

    options() {
        return {
            //authMechanism: this.config.authMechanism || 'DEFAULT',
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
}
module.exports = MongoDB;