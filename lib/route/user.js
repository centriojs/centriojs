'use strict';

const _ = require('../mixin'),
    {encrypt, decrypt} = require('../encrypt');

class UserRouter {
    constructor() {
        appEvent.on( 'init', this.setUserRoutes.bind(this) );
        appEvent.on( 'loaded', this.setUserFrontRoutes.bind(this) );
        appEvent.on( 'adminInit', this.setUserAdminRoutes.bind(this) );
    }

    setUserRoutes(router) {
        this.router = router;

        router.use( this.isUserLoggedIn.bind(this) );
        // Set front-page
        router.setView( '/', this.setFrontPage.bind(this) );

        router.post( '/login', this.validateAndLogin.bind(this) );
        router.setGetResponse( '/logout', this.logout.bind(this), true );

        router.setPostResponse( '/user-settings', this.updateSettings.bind(this), true );
        router.setPostResponse( '/user-activity', this.setActivity.bind(this), true );
    }

    async isUserLoggedIn( req, res, next ) {
        if ( ! _.isEmpty($_COOKIE.__usr__) ) {
            // Set current user
            await decrypt($_COOKIE.__usr__)
                .then( str => {
                    return getUserBy( 'email', str );
                })
                .then( user => {
                    global.currentUser = user;

                    return true;
                })
                .catch(errorHandler);
        }

        next();
    }

    setFrontPage() {
        if ( ! isUserLoggedIn() ) {
            return this.frontPage();
        }

        return this.dashboard();
    }

    frontPage() {
        // Check if there's front-page set other than login
        let response = {
            title: 'Front Page'
        };

        return response;
    }

    dashboard() {
        let response = {
            title: il8n('Dashboard')
        };

        return response;
    }

    setUserFrontRoutes(router) {}

    async validateAndLogin( req, res ) {
        let email = $_POST.email,
            pass = $_POST.pass,
            response = {};

        if ( ! this.router.isVerified() ) {
            response.error = true;
            response.message = il8n('Unauthorized request.');

            return res.json(response);
        }

        let user = await validateAndLogin( email, pass ).catch(errorHandler);

        if ( ! user || user.error ) {
            response.error = true;
            response.message = user.message || il8n('Cannot verify user credential.');

            return res.json(response);
        }

        // Set user cookie
        await encrypt(user.email)
            .then( hash => {
                // Save user hash in cookie
                this.router.setCookie({
                    name: '__usr__',
                    value: hash,
                    expires: Date.now() + (86400 * 60000 * 30)
                });

                return true;
            })
            .catch(errorHandler);

        global.currentUser = user;

        response.user = user;
        response.success = true;
        response.message = il8n('User successfully login.');

        return res.json(response);
    }

    async logout( req, res ) {
        // @todo: clear cookies etc

        /**
         * Trigger whenever user request for logout.
         *
         * @param {object} currentUser
         */
        await appEvent.trigger( 'userLogout', currentUser );

        return res.json({success: true});
    }

    setUserAdminRoutes(router) {
        router.setView( '/users', this.getUsers.bind(this), true, 'manageUsers' );
        router.setView( '/users/page/:page', this.getUsers.bind(this), true, 'manageUsers' );
        router.setView( '/users/edit', this.editUser.bind(this), true, 'addUser' );
        router.setView( '/users/edit/:id', this.editUser.bind(this), true, 'editUser' );
        router.setView( '/user-group', this.getGroups.bind(this), true, 'manageUserGroup' );
        router.setView( '/user-group/:id', this.editGroup.bind(this), true, 'manageUserGroup' );

        router.setPostResponse( '/users/edit', this.updateUser.bind(this), true, 'addUser' );
        router.setPostResponse( '/users/edit/:id', this.updateUser.bind(this), true, 'editUser' );
        router.setGetResponse( '/users/delete/:id', this.deleteUser.bind(this), this, 'deleteUser' );
        router.setPostResponse( '/user-group/:id', this.updateGroup.bind(this), this, 'manageUserGroup' );
        router.setGetResponse( '/user-group/delete/:id', this.deleteGroup.bind(this), this, 'deleteUserGroup' );

        router.setView( '/profile', this.editProfile.bind(this), this );
        router.setView( '/profile/:id', this.editProfile.bind(this), this, 'editUser' );

        router.setGetResponse( '/user-activities', this.getActivities.bind(this), this, 'manageUserActivities' );
        router.setGetResponse( '/user-activity/:id', this.deleteActivity.bind(this), this, 'deleteUserActivity' );
        router.setGetResponse( '/user-activity', this.getActivity.bind(this), true, 'manageUserActivities' );
    }

    async getUsers( param ) {
        let page = param.page || 1,
            group = param.group || false;

        let response = {
            title: il8n('Users'),
            templateNow: 'UsersManager'
        };

        let settings = await getUserSetting( currentUser.ID, '__users', {
            perPage: 50,
            columns: ['group', 'registered']
        });
        response.userSettings = settings;

        let queryArgs  = {
            page: page,
            perPage: settings.perPage
        };

        if ( group ) {
            queryArgs.group = group;
        }

        response.users = await getUsers(queryArgs);

        return response;
    }

    async editUser(param) {
        let userId = param.id || false,
            response = {
                title: userId ? il8n('Edit User') : il8n('Update User'),
                templateNow: 'EditUser'
            };

        if ( userId ) {
            let user = await getUser(userId);

            if ( user && user.ID ) {
                response.user = user;
            }
        }

        return response;
    }

    async updateUser( req, res ) {
        let userId = req.param.id || false,
            userData = _.pick( $_POST, ['display', 'email', 'pass', 'group'] ),
            response = {};

        if ( userId ) {
            userData.ID = userId;

            let done = await updateUserData(userData).catch(errorHandler);

            if ( ! done || done.error ) {
                response.error = true;
                response.message = done.message || il8n('Unable to update user.');

                return res.json(response);
            }

            response.ID = userId;
            response.success = true;
            response.message = il8n('Update successfully completed.');

            return res.json(response);
        }

        userId = await addUser(userData).catch(errorHandler);
        if ( ! userId || userId.error ) {
            response.error = true;
            response.message = userId.message || il8n('Unable to add new user.');

            return res.json(response);
        }

        response.ID = userId;
        response.success = true;
        response.message = il8n('New user successfully added.');

        return res.json(response);
    }

    async deleteUser( req, res ) {
        let userId = req.param.id,
            response = {};

        let done = await deleteUser(userId).catch(errorHandler);

        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('User cannot be deleted.');

            return res.json(response);
        }

        response.success = true;
        response.message = il8n('User successfully deleted.');

        return res.json(response);
    }

    async updateSettings( req, res ) {
        let settingId = req.param.settingId,
            settings = $_POST.settings,
            response = {};

        let done = await setUserSetting( currentUser.ID, settingId, settings ).catch(errorHandler);

        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('User settings cannot be updated.');

            return res.json(response);
        }

        response.success = true;
        response.message = il8n('Settings successfully updated.');

        return res.json(response);
    }

    async getGroups(param) {
        let search = param.search || '',
            queryArgs = {},
            response = {
                title: il8n('User Groups'),
                templateNow: 'GroupManager'
            };

        if ( search ) {
            queryArgs.search = search + '%';
        }

        response.groups = await getUserGroups(queryArgs);

        return response;
    }

    async editGroup(param) {
        let groupId = param.id || false,
            response = {
                title: groupId ? il8n('Edit User Group') : il8n('Update user group.'),
                templateNow: 'GroupManager'
            };

        if ( groupId ) {
            let group = await getUserGroup(groupId).catch(errorHandler);

            if ( group && group.ID ) {
                response.group = group;
            }
        }

        return response;
    }

    async updateGroup( req, res ) {
        let groupId = req.param.id || false,
            group = _.pick( $_POST, ['name', 'description', 'caps'] ),
            response = {};

        if ( groupId ) {
            let done = await updateUserGroup(group).catch(errorHandler);

            if ( ! done || done.error ) {
                response.error = true;
                response.message = done.message || il8n('Something went wrong. Unable to update user group.');

                return res.json(response);
            }

            response.message = il8n('User group successfully updated.');
        } else {
            groupId = await addUserGroup(group).catch(errorHandler);

            if ( ! groupId || groupId.error ) {
                response.error = true;
                response.message = groupId.message || il8n('Unable to add new user group.');

                return res.json(response);
            }

            response.message = il8n('New group successfully added.');
        }

        response.groupId = groupId;
        response.success = true;

        return res.json(response);
    }

    async deleteGroup( req, res ) {
        let groupId = req.param.groupId,
            response = {};

        let done = await deleteUserGroup(groupId).catch(errorHandler);
        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to delete user group.');

            return res.json(response);
        }

        // Handle existing users of this group
        let {todo, group} = $_POST;
        if ( todo ) {
            group = group || 0;

            let users = await getUsers({
                group: groupId,
                fields: 'ids'
            });

            if ( users.length ) {
                for ( let i = 0; i < users.length; i++ ) {
                    let userId = users[i];

                    if ( 'delete' === todo ) {
                        await deleteUser(userId).catch(errorHandler);
                    } else if ( 'move' === todo ) {
                        await updateUserData({
                            ID: userId,
                            group: group
                        }).catch(errorHandler);
                    }
                }
            }
        }

        response.success = true;
        response.message = il8n('User group successfully deleted.');

        return res.json(response);
    }

    async editProfile(param) {
        let id = param && param.id || currentUser.ID,
            response = {
                title: il8n('Edit Profile'),
                templateNow: 'UserProfile'
            };

        response.user = await getUser(id).catch(errorHandler);

        return response;
    }

    async setActivity( req, res ) {
        let activity = _.stripSlashes($_POST.activity),
            type = _.stripSlashes($_POST.type),
            status = _.stripSlashes($_POST.status),
            response = {};

        let done = await setUserActivity( currentUser.ID, activity, type, status ).catch(errorHandler);
        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to set user activity.');

            return res.json(response);
        }

        response.ID = done;
        response.success = true;
        response.message = il8n('Request successful.');

        return res.json(response);
    }

    async getActivity( req, res ) {
        let query = ['status', 'status__in', 'type', 'type__in', 'dateFrom', 'dateTo'],
            userId = _.stripSlashes($_POST.userId),
            response = {};

        query = _.stripSlashes(query);

        // @todo: apply page and perPage filter

        response.success = true;
        response.activities = await getUserActivity( userId, query );

        return res.json(response);
    }

    async getActivities( req, res ) {
        let query = _.pick( $_POST, ['user', 'user__in', 'status', 'status__in', 'type', 'type__in', 'dateFrom', 'dateTo']),
            response = {};

        query = _.stripSlashes(query);

        // @todo: apply page and perPage filter

        response.activities = await getUserActivities(query);

        return res.json(response);
    }

    async deleteActivity( req, res ) {
        let userId = req.params.id,
            response = {};

        let done = await deleteUserActivity(userId).catch(errorHandler);
        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to delete user activity.');

            return res.json(response);
        }

        response.success = true;
        response.message = il8n('Request completed.');

        return res.json(response);
    }
}
module.exports = new UserRouter();