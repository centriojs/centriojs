'use strict';

const assert = require('chai').assert;

require('../lib/load');

const {DatabaseManager} = require('../lib/db');

let config = {
    database: 'mysql',
    dbName: 'dbxhub',
    dbUser: 'dbxuser',
    dbPass: 'dbxpass',
    secretKey: '52071d25e7ec91dd36bdd5166f01659f'
};

global.dbManager = DatabaseManager(config);

describe('MySQL: User Query', () => {
    let userId;

    it('Should add new user', done => {
        addUser({
            display: 'nazzy',
            email: 'nazzy@local.dev',
            pass: '123456'
        })
            .then( ok => {
                userId = ok;
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should update user.', done => {
        updateUserData({
            ID: userId,
            group: 'admin2'
        })
            .then( ok => {
                assert.isOk(ok, true);
                done();
            })
            .catch(done);
    });

    it('Should get user where email is `nazzylove@local.dev`', done => {
        getUserBy( 'email', 'nazzy@local.dev' )
            .then( user => {
                assert.isOk(user, true);
                done();
            })
            .catch(done);
    });

    it('Should delete user', done => {
        deleteUser(userId)
            .then(ok => {
                assert.isOk(ok, true);
                done();
            })
            .catch(done);
    });

    it('Should close the database connection', () => {
        dbManager.close();
    });
});