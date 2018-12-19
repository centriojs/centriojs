'use strict';

const Cache = require('./cache'),
    {encrypt} = require('./encrypt'),
    _ = require('./mixin');

const userQuery = () => {
    let Query = dbManager.execQuery('users');

    switch ( Query.type ) {
        default :
            return require('./db/mysql/user')(Query);
    }
};

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

    /*

    let query, options;

    switch( userQuery().type ) {
        default :
            query = `SELECT * FROM ?? WHERE ${column} = ?`;
            options = [userQuery().table, value];

            break;

        case 'mongodb' :
            query = {};
            query[column] = value;
            options = {limit: 1};

            break;
    }

    return userQuery().get(query, options)
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            let user = results.shift();

            // @todo: Apply filter
            // @todo: Cache result

            return user;
        });

        */
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

    return userQuery().addUser(userData)
        .then( userId => {
            // @todo: Trigger action here
            // @todo: Clear caches here
            return userId;
        } );

    /**

    // Check if email ready exist
    let exist = await getUserBy( 'email', email ).catch(errorHandler);
    if ( exist.ID ) {
        return reject( il8n('Email already exist.') );
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

            return true;
        })
        .catch(errorHandler);

    if ( ! done || done.error ) {
        return reject( il8n('Unexpected error occur.') );
    }

    let Query = userQuery(),
        query = false,
        options = {};

    switch( Query.type ) {
        default :
            query = userData;
            break;

        case 'mongodb' :
            query = userData;
            query.ID = await Query.increment('ID');
            query._id = query.ID;
            options = {projection: {ID: 1}};

            break;
    }

    return userQuery().insert(userData, options)
        .then( results => {
            return results.insertId || results.insertedId;
        });

     **/
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

    /**

    // Validate email address if set
    let {email} = userData;
    if ( email ) {
        let exist = await getUserBy( 'email', email ).catch(errorHandler);
        if ( exist.ID && exist.ID !== ID ) {
            return reject( il8n('Email already exist.') );
        }
    }

    let filter, columns, options;

    switch( userQuery().type ) {
        default :
            filter = ['`ID` = ?'];
            columns = userData;
            options = [ID];

            break;

        case 'mongodb' :
            columns = {$set: userData};
            filter = {ID: ID};
            break;
    }

    delete columns.ID;

    // @todo: Delete cache

    return userQuery().update( filter, columns, options );
     **/
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

    /**
    // @todo: Clear cache

    let filter, options;

    switch( userQuery().type ) {
        default :
            filter = ['`ID` = ?'];
            options = [ID];
            break;

        case 'mongodb' :
            filter = {ID: ID};
            break;
    }

    let user = await getUser(ID).catch(errorHandler);
    if ( ! user || user.error ) {
        return reject( il8n('User does not exist.') );
    }

    // @todo: Clear cache

    return userQuery().delete( filter, options )
        .then( () => {
            // @todo: Do action hook here

            return true;
        });

     **/
};
setGlobalVar( 'deleteUser', deleteUser );

const getUsers = query => {
    query = query || {};

    return userQuery().getUsers(query)
        .then( results => {
            // @Todo: apply filters here

            return results;
        });
    /**
    let Query = userQuery(),
        {group, group__in, orderby, order, page, perPage} = query;

    order = order || 'ASC';
    page = page || 1;
    perPage = perPage || -1;

    let filter, options;

    switch( Query.type ) {
        default :
            filter = [];
            options = [];

            if ( group ) {
                filter.push('`group` = ?');
                options.push(group);
            }

            if ( group__in ) {
                filter.push('`group` IN (??)');
                options.push(group);
            }

            // @todo: Add year, month filter query

            if ( orderby ) {
                filter.push('ORDER BY `' + order + '`');
            }

            if ( perPage > 0 ) {
                let offset = page * perPage;
                filter.push(`LIMIT ${offset}, ${perPage}`);
            }

            break;

        case 'mongodb' :
            filter = {};
            options = {};

            if ( group ) {
                filter.group = group;
            } else if ( group__in ) {

            }

            if ( orderby ) {
                let sorter = {};
                sorter[orderby] = 'asc' === order.toLowerCase() ? 1 : -1;
            }

            if ( perPage > 0 ) {

            }

            break;
    }

     **/
};
setGlobalVar( 'getUsers', getUsers );