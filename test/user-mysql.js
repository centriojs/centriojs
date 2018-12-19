'use strict';

const assert = require('chai').assert;

require('../lib/load');

const {DatabaseManager} = require('../lib/db');

let config = {
    database: 'mysql',
    dbName: 'centriojs_test',
    dbUser: 'root',
    dbPass: 'root',
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

    it('Should get user where email is `nazzy@local.dev`', done => {
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

    it('Should get multiple users with no filter', async () => {
        let users = ['nash'];

        for ( let i = 1; i < 6; i++ ) {
            let user = users + i;

            await addUser({
                display: user,
                email: user + '@local.dev',
                pass: user + '12345'
            }).catch(returnFalse);
        }

        return getUsers()
            .then( results => {
                assert.isArray(results);
            });
    });

    it('Should get multiple users of the same group', done => {
        getUsers({
            group: 'subscriber'
        })
            .then( results => {
                assert.isOk( results, true );
                done();
            })
            .catch(done);
    });

    it('Should get 3 users of the same group', done => {
        getUsers({
            page: 1,
            perPage: 3,
            group__in: ['subscriber']
        })
            .then( results => {
                assert.equal(3, results.length );
                done();
            })
            .catch(done);
    });

    it('Should return an array of users ID', done => {
        getUsers({
            fields: 'IDs'
        })
            .then( results => {
                assert.isArray(results);
                done();
            })
            .catch(done);
    });

    it('Should close the database connection', () => {
        dbManager.close();
    });
});