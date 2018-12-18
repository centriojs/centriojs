'use strict';

const assert = require('chai').assert;

require('../lib/load');

const {DatabaseManager} = require('../lib/db');

let config = {
    database: 'mongodb',
    dbName: 'mongo-test',
    secretKey: '52071d25e7ec91dd36bdd5166f01659f'
};

global.dbManager = DatabaseManager(config);

describe('MongoDB: User query', () => {
    let userId;

    it('Should add new user', function(done) {
        this.timeout(5000);
        addUser({
            display: 'nazzy1',
            email: 'nazzy1@local.dev',
            pass: '123456'
        })
            .then( ok => {
                userId = ok;
                assert.isOk( ok, true );

                done();
            })
            .catch(done);
    });

    it('Should update `display` field.', done => {
        updateUserData({
            ID: userId,
            display: 'nash',
            group: 'admin'
        })
            .then( ok => {
                done();
            })
            .catch(done);
    });

    it('Should delete this user', done => {
        deleteUser(userId)
            .then( ok => {
                done();
            })
            .catch(done);
    });
});