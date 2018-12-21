'use strict';

const Cache = require('./cache'),
    {encrypt} = require('./encrypt'),
    _ = require('./mixin');

/**
 * Returns an instance of UserQuery use to execute user's queries.
 *
 * @returns {UserQuery|UserQuery}
 */
const userQuery = () => {
    let Query = dbManager.execQuery('users');

    switch ( Query.type ) {
        default :
            return require('./db/mysql/user')(Query);

        case 'mongodb':
            return require('./db/mongodb/user')(Query);
    }
};
setGlobalVar( 'userQuery', userQuery );

/**
 * Get user base on the given column/value.
 *
 * @param {string} column       The table/collection field name.
 * @param {string|int} value    The value of the column field.
 * @returns {Promise<*>}
 */
const getUserBy = (column, value) => {
    if ( ! column ) {
        return reject( il8n('Column name is required.') );
    }

    if ( ! value ) {
        return reject( _.sprintf( il8n('%s value is required.'), column ) );
    }

    // @todo: Get cached here

    return userQuery().getUserBy( column, value )
        .then( user => {
            // @todo: Filter here
            // @todo: Cache here
            return user;
        });
};
setGlobalVar( 'getUserBy', getUserBy );

/**
 * Get user data base on the given user ID.
 *
 * @param ID
 * @returns {*}
 */
const getUser = ID => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid user ID.') );
    }

    return getUserBy( 'ID', ID );
};
setGlobalVar( 'getUser', getUser );

/**
 * Insert new user to the database.
 *
 * @param {object} userData {
 *     @param {string} display          Required. User display name.
 *     @param {string} email            Required. The user's unique email address.
 *     @param {string} pass             Required. The unique password use to login.
 *     @param {string} group            Optional. The group the user belongs to. If null, will set the default user group.
 * }
 * @returns {Promise<*>}
 */
const addUser = async userData => {
    let {display, email, pass, group} = userData;

    if ( ! display ) {
        return reject( il8n('Display name is required.') );
    }

    if ( ! email ) {
        return reject( il8n('Email address is required.') );
    }

    if ( ! _.isEmail(email) ) {
        return reject( il8n('Invalid email address.') );
    }

    if ( ! pass ) {
        return reject( il8n('Password is required.') );
    }

    // @todo: Set default user group
    if ( ! group ) {
        userData.group = 'subscriber'; // todo: Change this to actual default user group
    }

    let done = await encrypt(pass)
        .then( hash => {
            userData.pass = hash;

            return userData;
        })
        .catch(errorHandler);

    if ( ! done || done.error ) {
        return reject( il8n('An unexpected error occurred.') );
    }

    return userQuery().addUser(userData)
        .then( userId => {
            // @todo: Trigger action here
            // @todo: Clear caches here
            return userId;
        } );
};
setGlobalVar( 'addUser', addUser );

/**
 * Update user data base on the given user ID.
 *
 * @param {object} userData {
 *     @param {int} ID              Required. The id of the user to update the data to.
 * }
 * @returns {*}
 */
const updateUserData = async userData => {
    let {ID} = userData;

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid user ID.') );
    }

    // Regenerate password if set
    let {pass} = userData;
    if ( pass ) {
        let done = await encrypt(pass)
            .then( hash => {
                userData.pass = hash;

                return true;
            })
            .catch(errorHandler);

        if ( ! done || done.error ) {
            return reject( il8n('Unknown error occurred.' ) );
        }
    }

    // @todo: Delete cached here

    return userQuery().updateUserData(userData)
        .then( ok => {
            // @todo: trigger action here
            // @Todo: apply filters here

            // @todo: cache results here
            return ok;
        });
};
setGlobalVar( 'updateUserData', updateUserData );

/**
 * Delete user from the database base on the given user ID.
 *
 * @param {int} ID
 * @returns {*}
 */
const deleteUser = async ID => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid user ID.') );
    }

    let user = await getUser(ID).catch(errorHandler);
    if ( ! user || user.error ) {
        return reject( il8n('User does not exist.') );
    }

    return userQuery().deleteUser(ID)
        .then( ok => {
            // @todo: Trigger action here
            // @todo: Clear all users cache here

            return ok;
        });
};
setGlobalVar( 'deleteUser', deleteUser );

/**
 * Get users base on the given query parameters.
 *
 * @param {object} query {              Optional
 *     @param {string|int} group        Optional. A group name or ID the user belong to.
 *     @param {string} group__in        Optional. An array of group name or id users belong to.
 *     @param {string|array} fields     Optional. If set with IDs, returns an array of ID, otherwise it returns an object.
 *     @param {string} orderby
 *     @param {string} order
 *     @param {int} page
 *     @param {int} perPage
 * }
 * @returns {*}
 */
const getUsers = query => {
    query = query || {};

    return userQuery().getUsers(query)
        .then( results => {
            // @Todo: apply filters here

            return results;
        });
};
setGlobalVar( 'getUsers', getUsers );