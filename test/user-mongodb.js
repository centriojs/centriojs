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
        //this.timeout(5000);
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

    it(`Should get user where using user ID.`, done => {
        getUser(userId)
            .then( user => {
                assert.equal( user.ID, userId );
                done();
            })
            .catch(done);
    });

    it('Should update user group into admin', function(done) {
        this.timeout(3000);

        updateUserData({ID: userId, group: 'admin'})
            .then( () => {
                return getUser(userId);
            })
            .then( user => {
                assert.equal( user.group, 'admin' );
                done();
            })
            .catch(done);
    });

    it('Should get user where email=nazzy1@local.dev', done => {
        getUserBy( 'email', 'nazzy1@local.dev' )
            .then( user => {
                assert.equal( user.email, 'nazzy1@local.dev' );
                done();
            })
            .catch(done);
    });

    it('Should delete user base on ID', function(done) {
        this.timeout(3000);

        deleteUser(userId)
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should get users with no filter', done => {
        getUsers()
            .then( users => {
                done();
            })
            .catch(done);
    });

    it('Should delete user base on ID', done => {
        deleteUser(userId)
            .then( ok => {
                done();
            })
            .catch(done);
    });

    it('Should return empty when getting users where display=nazzy', done => {
        getUsers({display: 'nazzy'})
            .then( users => {
                console.log(users);

                done();
            })
            .catch(done);
    });
});