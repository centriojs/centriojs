'use strict';

const assert = require('chai').assert;

require('../lib/load');

let {dbManager} = require('../lib/db');

let config = {
    database: 'mysql',
    dbName: 'dbxhub',
    dbUser: 'dbxuser',
    dbPass: 'dbxpass'
};

describe('MySQL database connection', () => {

    it('Connect to the database', done => {
        dbManager(config)
            .checkConnection()
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Close current database connection', done => {
        dbManager(config)
            .close()
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });
});

let mongoConfig = {
    database: 'mongodb',
    dbName: 'test-mongo'
};

describe('MongoDB Client connection', () => {
    it('Should connect to mongodb database', done => {
        dbManager(mongoConfig)
            .checkConnection()
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });
});


