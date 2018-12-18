'use strict';

const Cache = require('./cache'),
    {encrypt} = require('./encrypt'),
    _ = require('./mixin');

const userQuery = () => {
    return dbManager.execQuery('users');
};

/**
 * Get user base on the given column/value.
 *
 * @param {string} column       The table/collection field name.
 * @param {mixed} value
 * @returns {*}
 */
const getUserBy = (column, value) => {
    if ( ! column ) {
        return reject( il8n('Column name is required.') );
    }

    if ( ! value ) {
        return reject( _.sprintf( il8n('%s value is required.'), column ) );
    }

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

            // @todo: Cache result

            return user;
        });
};
Object.defineProperty(global, 'getUserBy', {
    value: getUserBy,
    writable: false
});

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
};

Object.defineProperty( global, 'addUser', {
    value: addUser,
    writable: false
});

const updateUserData = userData => {
    let {ID} = userData;

    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid user ID.') );
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
};
Object.defineProperty( global, 'updateUserData', {
    value: updateUserData,
    writable: false
});

const deleteUser = ID => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid user ID.') );
    }

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

    return userQuery().delete(filter, options);
};
Object.defineProperty( global, 'deleteUser', {
    value: deleteUser,
    writable: false
});