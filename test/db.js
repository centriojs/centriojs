'use strict';

const assert = require('chai').assert;

require('../lib/load');

let {dbManager} = require('../lib/db');

describe('MySQL database connection', () => {
    let config = {
        database: 'mysql',
        dbName: 'dbxhub',
        dbUser: 'dbxuser',
        dbPass: 'dbxpass'
    };

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
