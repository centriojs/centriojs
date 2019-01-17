'use strict';

const Cache = require('./cache'),
    {encrypt, decrypt} = require('./encrypt'),
    _ = require('./mixin');

/**
 * Returns an instance of UserQuery use to execute user's queries.
 *
 * @param {object} db           An instance of use database manager.
 *
 * @returns {UserQuery}
 */
const userQuery = db => {
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
setGlobalVar( 'userQuery', userQuery );

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

    return userQuery().getUserBy( column, value )
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
        console.log(done);
        return reject( il8n('An unexpected error occurred.') );
    }

    return userQuery().addUser(userData)
        .then( userId => {
            // Clear users cache
            Cache.clearGroup( 'users' );

            /**
             * Fired whenever a new user is inserted to the database.
             *
             * @param {int} userId
             */
            appEvent.trigger( 'insertedUser', userId );

            return userId;
        } )
        .catch( err => {
            console.log(err);
            return err;
        });
};
setGlobalVar( 'addUser', addUser );

/**
 * Update user data base on the given user ID.
 *
 * @param {object} userData {
 *     @param {int} ID              Required. The id of the user to update the data to.
 * }
 * @returns {Promise<*>}
 */
const updateUserData = async userData => {
    let {ID} = userData;

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid user ID.') );
    }

    let user = await getUser(ID).catch(errorHandler);
    if ( ! user || user.error ) {
        return reject( il8n('User does not exist.') );
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

    return userQuery().updateUserData(userData)
        .then( () => {
            clearCache(user);

            /**
             * Trigger whenever a user's data is updated to the database.
             *
             * @param {int} ID
             */
            appEvent.trigger( 'updatedUser', ID );

            return ID;
        });
};
setGlobalVar( 'updateUserData', updateUserData );

/**
 * Delete user from the database base on the given user ID.
 *
 * @param {int} ID
 * @returns {Promise<*>}
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
            clearCache(user);

            /**
             * Trigger whenever a user is deleted from the database.
             *
             * @param {int} ID
             * @param {object} user
             */
            appEvent.trigger( 'deletedUser', ID, user );

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

    let key = generateKey(query),
        cache = Cache.get( 'users', key );

    if ( key && cache ) {

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
             */
            user = await Filter.apply( 'getUser', user );
            cache[i] = user;
        }

        return resolve(cache);
    }

    return userQuery().getUsers(query)
        .then( async results => {
            if ( ! results.length ) {
                return [];
            }

            if ( key ) {
                Cache.set( 'users', key, results );
            }

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
        })
        .catch( err => {
            errorHandler(err);

            return [];
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

    return userQuery().getSettings(userId)
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            let settings = {};

            results.map( result => {
                settings[result.name] = unserialize(result.value);
            });

            Cache.set( 'userSetting', userId, settings );

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
        })
        .catch( err => {
            errorHandler(err);

            return $default;
        } );
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

    return userQuery().setSetting( userId, name, value )
        .then( () => {
            Cache.clear( 'userSetting', userId );

            return true;
        });
};
setGlobalVar( 'setUserSetting', setUserSetting );

/**
 * Delete user's setting base on the given user ID and setting name.
 *
 * @param {int} userId              Required. The id of the user to delete the setting from.
 * @param {string} name             Optional. The name of the setting to delete to. If omitted, will delete all settings
 *                                  of the given user ID.
 * @returns {Promise<*>}
 */
const deleteUserSetting = function(userId) {
    let name = arguments[1] || false;

    if ( _.isNaN(userId) ) {
        return reject( il8n('Invalid user ID.') );
    }

    if ( ! name ) {
        return reject( il8n('No setting name') );
    }

    Cache.clear( 'userSetting', userId );

    return userQuery().deleteSetting( userId, name );
};
setGlobalVar( 'deleteUserSetting', deleteUserSetting );

/**
 * Verify user credential for login.
 *
 * @param email
 * @param pass
 * @returns {Promise<*>}
 */
const validateAndLogin = async (email, pass) => {
    if ( ! email || ! _.isEmail(email) ) {
        return reject( il8n('Invalid email address.') );
    }

    if ( ! pass ) {
        return reject( il8n('Invalid password.') );
    }

    let user = await getUserBy( 'email', email ).catch(errorHandler);
    if ( ! user || user.error ) {
        return reject( il8n('Email does not exist.') );
    }

    let match = await decrypt(user.pass).catch(errorHandler);
    if ( ! match || match.error ) {
        return reject( il8n('Unexpected error occurred.') );
    }

    if ( ! _.isEqual( match, pass.toString() ) ) {
        return reject( il8n('Mismatch email and password.') );
    }

    /**
     * Fired whenever user successfully login.
     *
     * @param (object) user
     */
    await appEvent.trigger( 'userLogin', user );

    return resolve(user);
};
setGlobalVar( 'validateAndLogin', validateAndLogin );

/**
 * Add user group to the database.
 *
 * @param {object} group {
 *     @param {string} name
 *     @param {string} description
 *     @param {object} caps
 * }
 * @returns {Promise<*>}
 */
const addUserGroup = group => {
    let {name} = group;

    if ( ! name ) {
        return reject( il8n('No group name.') );
    }

    return userQuery().addGroup(group)
        .then( id => {
            Cache.clearGroup( 'usersGroup' );

            return id;
        });
};
setGlobalVar( 'addUserGroup', addUserGroup );

/**
 * Update user group to the database.
 *
 * @param {object} group {
 *     @param {int} ID                      Required. The id of the group to update to.
 *     @param {string} name
 *     @param {string} description
 *     @param {object} caps
 * }
 * @returns {Promise<*>}
 */
const updateUserGroup = group => {
    let {ID} = group;

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid group id.') );
    }

    return userQuery().updateGroup(group)
        .then( async () => {
            Cache.clear( 'userGroup', ID );
            Cache.clearGroup( 'usersGroup' );

            /**
             * Fired whenever user group data is updated.
             *
             * @param {int} groupId
             */
            appEvent.trigger( 'updatedUserGroup', ID );

            return ID;
        });
};
setGlobalVar( 'updateUserGroup', updateUserGroup );

/**
 * Delete use group from the database.
 *
 * @param {int} groupId
 * @returns {Promise<*>}
 */
const deleteUserGroup = async groupId => {
    groupId = parseInt(groupId);

    if ( _.isNaN(groupId) ) {
        return reject( il8n('Invalid group id.') );
    }

    let group = await getUserGroup(groupId).catch(errorHandler);
    if ( ! group || group.error ) {
        return reject( il8n('Invalid group id.') );
    }

    return userQuery().deleteGroup(groupId)
        .then( async () => {
            Cache.clear( 'userGroup', groupId );
            Cache.clearGroup( 'usersGroup' );

            /**
             * Fired whenever a user group is deleted from the database.
             *
             * @param {int} groupId
             * @param {object} group
             */
            appEvent.trigger( 'deletedUserGroup', groupId, group );

            return true;
        })
        .catch( err => {
            console.log(err);
            return err;
        });
};
setGlobalVar( 'deleteUserGroup', deleteUserGroup );

/**
 * Get user group base on the given id.
 *
 * @param {int} groupId
 * @returns {Promise<*>}
 */
const getUserGroup = groupId => {
    groupId = parseInt(groupId);

    if ( _.isNaN(groupId) ) {
        return reject( il8n('Invalid group id.') );
    }

    let cache = Cache.get( 'userGroup', groupId );
    if ( cache ) {
        return resolve(cache);
    }

    return userQuery().getGroup(groupId)
        .then( group => {

            Cache.set( 'userGroup', groupId, group );

            return group;
        });
};
setGlobalVar( 'getUserGroup', getUserGroup );

/**
 * Get the list of user group from the database.
 *
 * @param {object} query {
 *     @param {string} search
 *     @param {int} page
 *     @param {int} perPage
 *     @param {string} order
 * }
 * @returns {Promise<*>}
 */
const getUserGroups = query => {
    query = query || {};

    let key = generateKey(query),
        cache = Cache.get( 'usersGroup', key );

    if ( key && cache ) {
        return resolve(cache);
    }

    return userQuery().getGroups(query)
        .then( results => {
            if ( ! results.length ) {
                return [];
            }

            results.map( group => {
                Cache.set( 'userGroup', group.ID, group );
            });

            if ( key ) {
                Cache.set( 'usersGroup', key, results );
            }

            return results;
        })
        .catch( err => {
            errorHandler(err);

            return [];
        });
};
setGlobalVar( 'getUserGroups', getUserGroups );

/**
 * Check if user is currently logged in.
 *
 * @returns {boolean}
 */
const isUserLoggedIn = () => {
    if ( ! global.currentUser || ! currentUser.ID ) {
        return false;
    }

    return true;
};
setGlobalVar( 'isUserLoggedIn', isUserLoggedIn );

/**
 * Save user activity to the database.
 *
 * @param {int} userId
 * @param {string} activity
 * @param {string} type
 * @returns {Promise<*>}
 */
const setUserActivity = function( userId, activity, type ) {

    if ( ! userId || ! activity || ! type ) {
        return reject( il8n('Missing required argument.') );
    }

    userId = parseInt(userId);
    if ( _.isNaN(userId) ) {
        return reject( il8n('Invalid user id.') );
    }

    let status = arguments[3] || false;

    return userQuery().setActivity( userId, activity, type, status )
        .then( () => {
            Cache.clear( 'userActivity', userId );
            Cache.clearGroup( 'userActivities' );

            return true;
        });
};
setGlobalVar( 'setUserActivity', setUserActivity );

/**
 * Delete user activity or activities.
 *
 * @param {int} userId              The id of the user to delete the activities to.
 * @param {string} column           The column name use to filter the deletion.
 * @param {any} value               The value of the specified column filter.
 * @returns {Promise<*>}
 */
const deleteUserActivity =  function(userId) {
    if ( _.isNaN(userId) ) {
        return reject( il8n('Invalid user id.') );
    }

    let column = arguments[1] || false,
        value = arguments[2] || false;

    return userQuery().deleteActivity( userId, column, value )
        .then( () => {
            Cache.clear( 'userActivity', userId );
            Cache.clearGroup( 'userActivities' );

            return true;
        });
};
setGlobalVar( 'deleteUserActivity', deleteUserActivity );

/**
 * Get the activities of the given user id.
 *
 * @param {int} userId
 * @param {object} query {
 *     @param {string} status
 *     @param {array} status__in
 *     @param {string} type
 *     @param {array} type__in
 *     @param {date} dateFrom
 *     @param {date} dateTo
 *     @param {int} page
 *     @param {int} perPage
 * }
 * @returns {Promise<*>}
 */
const getUserActivity = (userId, query) => {
    userId = parseInt(userId);

    if ( _.isNaN(userId) ) {
        return reject( il8n('Invalid user id.') );
    }

    let key = generateKey(query),
        cache = Cache.get( 'userActivity', userId );
    if ( cache && key && cache[key] ) {
        return resolve(cache[key]);
    }

    cache = cache || {};

    return userQuery().getActivity( userId, query )
        .then( results => {
            if ( ! results.length ) {
                return [];
            }

            if ( key ) {
                cache[key] = results;
            }

            Cache.set( 'userActivity', userId, cache );

            return results;
        });
};
setGlobalVar( 'getUserActivity', getUserActivity );

/**
 * Get user(s) activities base on the filtered query.
 * @param {object} query {
 *     @param {int} user
 *     @param {array} user__in
 *     @param {string} status
 *     @param {array} status__in
 *     @param {string} type
 *     @param {array} type__in
 *     @param {date} dateFrom
 *     @param {date} dateTo
 *     @param {int} page
 *     @param {int} perPage
 * }
 * @returns {Promise<*>}
 */
const getActivities = query => {
    let key = generateKey(query),
        cache = Cache.get( 'userActivities', key );

    if ( cache ) {
        return resolve(cache);
    }

    return userQuery().getActivities(query)
        .then( results => {
            if ( ! results.length ) {
                return [];
            }

            Cache.set( 'userActivities', key, results );

            return results;
        })
        .catch(err => {
            errorHandler(err);

            return [];
        });
};
setGlobalVar( 'getActivities', getActivities );

const getUserCaps = async userId => {
    let caps = {read: true};

    let user = await getUser(userId).catch(errorHandler);
    if ( ! user || user.error ) {
        return caps;
    }

    caps.readPrivate = true;

    caps = await Filter.apply( 'getUserCaps', caps, userId );

    return caps;
};
setGlobalVar( 'getUserCaps', getUserCaps );

const userCan = async function(userId, cap) {
    let user = await getUser(userId).catch(errorHandler),
        caps = await getUserCaps(userId);

    if ( user && 'administrator' === user.group ) {
        return true; // Always return true for administrators
    }

    let hasCap = await Filter.apply( 'userCan', !!caps[cap], userId );

    return hasCap;
};
setGlobalVar( 'userCan', userCan );

const currentUserCan = function(cap) {
    return userCan( currentUser.ID, cap );
};
setGlobalVar( 'currentUserCan', currentUserCan );