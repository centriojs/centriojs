'use strict';

const assert = require('chai').assert,
    _ = require('../lib/mixin');

let userRouter = require('../lib/route/user');

describe('User routes', () => {
    userRouter.setCurrentUser();

    it('Should return the list of users', function(done) {
        userRouter.getUsers({param: {}})
            .then( response => {
                assert.equal(response.title, 'Users');
                assert.isArray(response.users, true);
                assert.equal(response.userSettings.perPage, 50);
                done();
            })
            .catch(done);
    });

    let userId;

    let req = {
        param: {}
    };

    let res = {
        json: json => {
            return json;
        }
    };

    it('Should add new user', function(done) {
        global.$_POST = {
            display: 'irene',
            email: 'irene@local.dev',
            group: 'administrator',
            pass: 123456
        };

        userRouter.updateUser( req, res )
            .then( response => {
                assert.equal( response.success, true );
                userId = response.ID;
                done();
            })
            .catch(done);
    });

    it('Should update user group', function(done) {
        global.$_POST = {group: 'admin'};

        userRouter.updateUser( {param: {id: userId}}, res )
            .then( response => {
                assert.isTrue( response.success, true );
                done();
            })
            .catch(done);
    });

    it('Should get user data for editing', function(done) {
        userRouter.editUser({param: {id: userId}})
            .then( response => {
                assert.equal(response.user.ID, userId);
                done();
            })
            .catch(done);
    });

    it('Should delete user from the database', function(done) {
        userRouter.deleteUser({param: {id: userId}}, res )
            .then( response => {
                assert.isTrue( response.success, true );
                done();
            })
            .catch(done);
    });

    it('Should update user settings', function(done) {
        global.$_POST = {
            settings: {
                perPage: 5
            }
        };

        userRouter.updateSettings( {param: {settingId: '__settings'}}, res )
            .then( response => {
                assert.isTrue( response.success, true );
                done();
            })
            .catch(done);
    });

    let groupId;

    it('Should add new user group', function(done) {
        global.$_POST = {
            name: 'Subscriber',
            description: 'The lowest group',
            caps: {read: 1}
        };

        userRouter.updateGroup( req, res )
            .then( response => {
                assert.isTrue( response.success );
                groupId = response.groupId;
                done();
            })
            .catch(done);
    });

    it('Should delete user group', function(done) {
        userRouter.deleteGroup( {param: {groupId: groupId}}, res )
            .then( response => {
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    });

    it('Should close database connection', done => {
        dbManager.close();
        done();
    });
});