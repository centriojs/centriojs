'use strict';

const assert = require('chai').assert;

require('../lib/load');

let {dbManager, createDBTable} = require('../lib/db');

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

describe('MySQL table cycle', () => {
    it('Create new table', done => {
        createDBTable({
            name: 'test1',
            columns: {
                ID: {
                    type: 'BIGINT',
                    length: 10,
                    required: true,
                    primary: true,
                    increment: true
                },
                name: {
                    type: 'VARCHAR',
                    required: true
                }
            }
        })
            .then( ok => {
                assert.isOk(ok, true);
                done();
            })
            .catch(done);
    });

    it('Get the table structure', done => {
        dbManager(config)
            .query('test1')
            .getColumnsStructure()
            .then( structure => {
                console.log(structure);
                done();
            })
            .catch(done);
    })
});

let mongoConfig = {
    database: 'mongo',
    dbName: 'test-mongo'
};

describe('MongoDB Client connection', () => {
    it('Should connection to mongodb local database', done => {
        dbManager(mongoConfig)
            .checkConnection()
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Create new table', done => {
        createDBTable({
            name: 'test1',
            columns: {
                ID: {
                    type: 'BIGINT',
                    length: 10,
                    required: true,
                    primary: true,
                    increment: true,
                    index: true
                },
                name: {
                    type: 'VARCHAR',
                    required: true,
                    index: true
                }
            }
        })
            .then( ok => {
                assert.isOk(ok, true);
                done();
            })
            .catch(done);
    });
});


