'use strict';

const _ = require('../mixin');

class UserRouter {
    constructor() {}

    setCurrentUser() {
        global.currentUser = {ID: 1};
    }

    async validateAndLogin( req, res ) {
        let email = $_POST.email,
            pass = $_POST.pass,
            response = {};

        let user = await validateAndLogin( email, pass ).catch(errorHandler);
        if ( ! user || user.error ) {
            response.error = true;
            response.message = user.message || il8n('Cannot verify user credential.');

            return res.json(response);
        }

        global.currentUser = user;

        // @todo: save user cookies

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

    async getUsers({param}) {
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

    async editUser({param}) {
        let userId = param.id || false;

        let response = {
            title: userId ? il8n('Edit User') : il8n('Update User')
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

    async getGroups({param}) {
        let search = param.search || '',
            queryArgs = {},
            response = {};

        if ( search ) {
            queryArgs.search = search + '%';
        }

        response.group = await getUserGroups(queryArgs);

        return response;
    }

    async editGroup({param}) {
        let groupId = param.id || false,
            response = {
                title: groupId ? il8n('Edit User Group') : il8n('Update user group.')
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
                response.message = done.message || il8n('Unable to update user group.');

                return res.json(response);
            }

            response.groupId = groupId;
            response.success = true;
            response.message = il8n('User group successfully updated.');

            return res.json(response);
        }

        groupId = await addUserGroup(group).catch(errorHandler);
        if ( ! groupId || groupId.error ) {
            response.error = true;
            response.message = groupId.message || il8n('Unable to add new user group.');

            return res.json(response);
        }

        response.success = true;
        response.groupId = groupId;
        response.message = il8n('New group successfully added.');

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

        response.success = true;
        response.message = il8n('User group successfully deleted.');

        return res.json(response);
    }
}
module.exports = new UserRouter();