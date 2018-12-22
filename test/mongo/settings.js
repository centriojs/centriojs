'use strict';

const assert = require('chai').assert;

require('../../lib/load');

const {DatabaseManager} = require('../../lib/db');

let config = {
    database: 'mongodb',
    dbName: 'mongo-test',
    secretKey: '52071d25e7ec91dd36bdd5166f01659f'
};

global.dbManager = DatabaseManager(config);

describe('Mysql: Settings queries', () => {
    it('Should set a new setting name=test1', done => {
        setSetting( 'test1', 'computer' )
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should get the value of setting name=test1', done => {
        getSetting('test1')
            .then( value => {
                assert.equal( value, 'computer' );
                done();
            })
            .catch(done);
    });

    it('Should update the setting value into a type object', function(done) {
        this.timeout(3000);

        setSetting( 'test1', {
            one: 1,
            two: 2
        })
            .then( (ok) => {
                return getSetting('test1');
            })
            .then( value => {
                assert.isObject(value, true);
                done();
            })
            .catch(done);
    });

    it('Should delete setting where name=test1', done => {
        deleteSetting('test1')
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });
});