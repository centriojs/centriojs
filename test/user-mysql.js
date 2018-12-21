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

    Filter.on( 'getUser', function test1(user) {
        user.name = 'nash';

        return user;
    });

    it('Should add new user', function(done) {
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

    it(`Should get user where using ID.`, done => {
        getUser(userId)
            .then( user => {
                assert.equal( user.ID, userId );
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

    it('Should set user setting', done => {
        setUserSetting( userId, 'test101', 'irene' )
            .then( ok => {
                //assert.isOk( ok, true );
                done();
            })
            .catch( err => {
                console.log(err);
                done();
            });
    });

    it('Should get user setting where name=test101', done => {
        getUserSetting( userId, 'test101' )
            .then( setting => {
                assert.equal( setting, 'irene' );
                done();
            })
            .catch(done);
    });

    it('Should update setting value from irene=nash', done => {
        setUserSetting( userId, 'test101', 'nash' )
            .then( async () => {
                let setting = await getUserSetting( userId, 'test101' ).catch(returnFalse);

                assert.equal(setting, 'nash');
                done();
            })
            .catch(done);
    });

    it('Should update setting value into an object', done => {
        setUserSetting( userId, 'test101', {
            name: 'irene',
            key: 'keys'
        })
            .then( ok => {
                done();
            })
            .catch(done);
    });

    it('Should return an object as setting value', done => {
        getUserSetting( userId, 'test101' )
            .then( value => {
                assert.isObject( value, true );
                done();
            })
            .catch(done);
    });

    it('Should delete user setting', done => {
        deleteUserSetting( userId, 'test101' )
            .then( ok => {
                assert.isOk( ok, true );
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

    let ids = [];
    it('Should get users with no filter', async function() {
        this.timeout(10000);

        let users = ['nash'];

        for ( let i = 1; i <= 6; i++ ) {
            let user = users + i;

            let id = await addUser({
                display: user,
                email: user + '@local.dev',
                pass: user + '12345',
                group: 'subscriber'
            }).catch(returnFalse);

            if ( id > 0 ) {
                ids.push(id);
            }
        }

        return getUsers()
            .then( users => {
                assert.isArray(users);
            });
    });

    it('Should get users where group=subscriber', done => {
        getUsers({group: 'subscriber'})
            .then( users => {
                let notMatch = false;

                users.map( user => {
                    if ( 'subscriber' !== user.group ) {
                        notMatch = true;
                    }
                });

                assert.isFalse( notMatch, true );
                done();
            })
            .catch(done);
    });

    it('Should get users ID in page 1', done => {
        getUsers({
            perPage: 3,
            fields: 'ids'
        })
            .then( users => {
                console.log(users);
                assert.equal( 3, users.length );
                done();
            })
            .catch(done);
    });

    it('Should get users ID in page 2', done => {
        getUsers({
            perPage: 3,
            page: 2,
            fields: 'ids'
        })
            .then( users => {
                console.log(users);
                assert.equal(3, users.length);
                done();
            })
            .catch(done);
    });

    it('Should delete all users', done => {
        userQuery().query( `DELETE FROM ${userQuery().dbManager.table}`)
            .then( ok => {
                assert.isOk(ok, true);
                done();
            })
            .catch(done);
    });

    it('Should close the database connection', () => {
        dbManager.close();
    });
});