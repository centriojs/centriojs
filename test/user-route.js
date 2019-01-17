'use strict';

const assert = require('chai').assert,
    _ = require('../lib/mixin');

let userRouter = require('../lib/route/user');

let req = {
    param: {}
};

let res = {
    json: json => {
        return json;
    }
};

describe('User routes', () => {
    userRouter.setCurrentUser();

    let userId;

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

    it('Should return the users manager page', function(done) {
        this.timeout(5000);

        userRouter.getUsers({})
            .then( response => {
                assert.equal(response.title, 'Users');
                assert.isArray(response.users, true);
                assert.equal(response.userSettings.perPage, 50);
                done();
            })
            .catch(done);
    });

    it('Should verify and login user', function(done) {
        global.$_POST = {
            email: 'irene@local.dev',
            pass: 123456
        };

        userRouter.validateAndLogin( req, res )
            .then( response => {
                assert.isTrue( response.success, true );
                assert.equal( response.user.ID, currentUser.ID );
                done();
            })
            .catch(done);
    });

    it('Should update user group', function(done) {
        this.timeout(5000);

        global.$_POST = {group: 'admin'};

        userRouter.updateUser( {param: {id: userId}}, res )
            .then( response => {
                assert.isTrue( response.success, true );
                done();
            })
            .catch(done);
    });

    it('Should get user data for editing', function(done) {
        userRouter.editUser({id: userId})
            .then( response => {
                assert.equal(response.user.ID, userId);
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
            name: 'Lowest',
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

    it('Should get user groups', function(done) {
        this.timeout(3000);

        userRouter.getGroups(req)
            .then( response => {
                assert.equal( response.groups.length, 2 );
                done();
            })
            .catch(done);
    });

    it('Should get user group for visual editing', function(done) {
        userRouter.editGroup({id: groupId})
            .then( response => {
                assert.equal( response.group.ID, groupId );
                done();
            })
            .catch(done);
    });

    it('Should delete user group', function(done) {
        this.timeout(5000);

        userRouter.deleteGroup( {param: {groupId: groupId}}, res )
            .then( response => {
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    });

    it('Should get user profile for visual editing', function(done) {
        this.timeout(5000);

        userRouter.editProfile({id: userId})
            .then( response => {
                assert.equal( response.user.ID, userId );
                done();
            })
            .catch();
    });

    it('Should set user activity via $_POST', function(done) {
        this.timeout(5000);

        global.$_POST = {
            activity: 'Doing some test now',
            type: 'others',
            userId: userId
        };

        userRouter.setActivity( req, res )
            .then( response => {
                assert.isTrue( response.success );
                done();
            })
            .catch();
    });

    it('Should get user activities', function(done) {
        this.timeout(5000);

        userRouter.getActivity( req, res )
            .then( response => {
                assert.isTrue( response.success );
                assert.equal( response.activities.length, 1 );
                done();
            })
            .catch(done);
    });

    it('Should delete user activities', function(done) {
        this.timeout(5000);

        userRouter.deleteActivity( {params: {id: userId}}, res )
            .then( response => {
                assert.isTrue( response.success );
                done();
            })
            .catch();
    })

    it('Should delete user from the database', function(done) {
        this.timeout(5000);

        userRouter.deleteUser({param: {id: userId}}, res )
            .then( response => {
                assert.isTrue( response.success, true );
                done();
            })
            .catch(done);
    });
});