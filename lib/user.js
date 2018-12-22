'use strict';

const Cache = require('./cache'),
    {encrypt} = require('./encrypt'),
    _ = require('./mixin');

/**
 * Returns an instance of UserQuery use to execute user's queries.
 *
 * @param {object} db           An instance of use database manager.
 *
 * @returns {UserQuery}
 */
const user = db => {
    if ( ! db ) {
        db = dbManager;
    }

    let Query = db.execQuery('users');

    switch ( Query.type ) {
        default :
            return require('./db/mysql/user')(db);

        case 'mongodb' :
            return require('./db/mongodb/user')(db);
    }
};
setGlobalVar( 'user', user );

const cacheUser = user => {
    Cache.set( 'user_ID', user.ID, user );
    Cache.set( 'user_email', user.email, user );
};

const clearCache = user => {
    Cache.clear( 'user_ID', user.ID );
    Cache.clear( 'user_email', user.email );
    Cache.clearGroup( 'users' );
};

/**
 * Get user base on the given column/value.
 *
 * @param {string} column       The table/collection field name.
 * @param {string|int} value    The value of the column field.
 * @returns {Promise<*>}
 */
const getUserBy = async (column, value) => {
    if ( ! column ) {
        return reject( il8n('Column name is required.') );
    }

    if ( ! value ) {
        return reject( _.sprintf( il8n('%s value is required.'), column ) );
    }

    let allowed = ['ID', 'email'];
    if ( ! _.contains( allowed, column ) ) {
        return reject( il8n('Invalid column name.') );
    }

    let cache = Cache.get( 'user_' + column );
    if ( cache ) {
        /**
         * Filter the user object before returning.
         *
         * @param {object} user
         * @return {object} user
         */
        cache = await Filter.apply( 'getUser', cache );

        return resolve(cache);
    }

    return user().getUserBy( column, value )
        .then( async user => {
            cacheUser( user );

            /**
             * Filter the user object before returning.
             *
             * @param {object} user
             * @return {object} user
             */
            user = await Filter.apply( 'getUser', user );

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

    // Clear users cache
    Cache.clearGroup( 'users' );

    return user().addUser(userData)
        .then( userId => {
            // @todo: Trigger action here
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

    let user = await getUser(ID).catch(errorHandler);
    if ( ! user || user.error ) {
        return reject( il8n('User does not exist.') );
    }

    clearCache(user);

    return user().updateUserData(userData)
        .then( ok => {
            // @todo: trigger action here

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

    clearCache(user);

    return user().deleteUser(ID)
        .then( ok => {
            // @todo: Trigger action here

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
const getUsers = async query => {
    query = query || {};

    let keys = _.pick( query, ['group', 'page', 'perPage', 'order', 'orderby']);
    if ( keys ) {
        keys = _.values(keys);
    }

    if ( query.group__in ) {
        keys.push( query.group__in.join('-') );
    }

    if ( query.fields ) {
        let fields = _.isArray(query.fields) ? query.fields.join('-') : query.fields;
        keys.push(fields);
    }

    if ( ! keys || ! keys.length ) {
        keys = ['users'];
    }

    let key = keys.join('-'),
        cache = Cache.get( 'users', key );

    if ( cache ) {

        for ( let i = 0; i < cache.length; i++ ) {
            let user = cache[i];

            if ( query.fields ) {
                // Don't apply filters on custom query
                break;
            }

            /**
             * Filter the user object before returning.
             *
             * @param {object} user
             * @return {object} user
             */
            user = await Filter.apply( 'getUser', user );
            cache[i] = user;
        }

        return resolve(cache);
    }

    return user().getUsers(query)
        .then( async results => {
            Cache.set( 'users', key, results );

            let users = [];

            for ( let i = 0; i < results.length; i++ ) {
                let user = results[i];

                cacheUser(user);

                if ( ! query.fields ) {
                    // Don't apply filters on custom query

                    /**
                     * Filter the user object before returning.
                     *
                     * @param {object} user
                     * @return {object} user
                     */
                    user = await Filter.apply('getUser', user);
                }

                users.push(user);
            }

            return users;
        });
};
setGlobalVar( 'getUsers', getUsers );

/**
 * Get all settings of the given user ID.
 *
 * @param {int} userId
 * @returns {Promise<*>}
 */
const getUserSettings = userId => {
    userId = parseInt(userId);

    if ( _.isNaN(userId) ) {
        return reject( il8n('Invalid user ID.') );
    }

    let cache = Cache.get( 'userSetting', userId );
    if ( cache ) {
        return resolve(cache);
    }

    return user().getSettings(userId)
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            let settings = {};

            results.map( result => {
                settings[result.name] = unserialize(result.value);
            });

            Cache.set( 'userSettings', userId, settings );

            return settings;
        });
};
setGlobalVar( 'getUserSettings', getUserSettings );

/**
 * Get the user's setting value base on user ID and setting name.
 *
 * @param {int} userId                              Required. The the ID of the user to retrieve the setting from.
 * @param {string} name                             Required. The name of the setting to get the value to.
 * @param {string|int|array|object} $default        Optional. The default value if no setting value found.
 * @returns {Promise<*>}
 */
const getUserSetting = (userId, name, $default) => {
    userId = parseInt(userId);

    if ( _.isNaN(userId) ) {
        return reject( il8n('Invalid user ID.') );
    }

    if ( ! name ) {
        return reject( il8n('No setting name') );
    }

    let cache = Cache.get( 'userSetting', userId );
    if ( cache ) {
        if ( ! cache[name] ) {
            return resolve($default);
        }

        return resolve(cache[name]);
    }

    return getUserSettings(userId)
        .then( settings => {
            if ( ! settings[name] ) {
                return $default;
            }

            return settings[name];
        });
};
setGlobalVar( 'getUserSetting', getUserSetting );

/**
 * Set or update user's setting.
 *
 * @param {int} userId
 * @param {string} name
 * @param {string|int|array|object} value
 * @returns {Promise<*>}
 */
const setUserSetting = (userId, name, value) => {
    userId = parseInt(userId);

    if ( _.isNaN(userId) ) {
        return reject( il8n('Invalid user ID.') );
    }

    if ( ! name ) {
        return reject( il8n('No setting name') );
    }

    value = serialize(value);

    Cache.clear( 'userSetting', userId );

    return user().setSetting( userId, name, value );
};
setGlobalVar( 'setUserSetting', setUserSetting );

/**
 * Delete user's setting base on the given user ID and setting name.
 *
 * @param {int} userId              Required. The id of the user to delete the setting from.
 * @param {string} name             Required. The name of the setting to delete to.
 * @returns {Promise<*>}
 */
const deleteUserSetting = (userId, name) => {
    userId = parseInt(userId);

    if ( _.isNaN(userId) ) {
        return reject( il8n('Invalid user ID.') );
    }

    if ( ! name ) {
        return reject( il8n('No setting name') );
    }

    Cache.clear( 'userSetting', userId );

    return user().deleteSetting( userId, name );
};
setGlobalVar( 'deleteUserSetting', deleteUserSetting );

/**
 * Remove all settings of the given user ID.
 *
 * @param {int} userId
 * @returns {Promise<*>}
 */
const deleteUserSettings = userId => {
    userId = parseInt(userId);

    if ( _.isNaN(userId) ) {
        return reject( il8n('Invalid user ID.') );
    }

    Cache.clear( 'userSetting', userId );

    return user().deleteSettings(userId);
};
setGlobalVar( 'deleteUserSettings', deleteUserSettings );