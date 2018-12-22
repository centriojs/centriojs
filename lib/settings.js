'use strict';

const Cache = require('./cache');

/**
 * Returns an instance of SettingQuery.
 *
 * @param {object} db
 * @returns {SettingQuery}
 */
const settingQuery = db => {
    if ( ! db ) {
        db = dbManager;
    }

    let Query = db.execQuery('settings');

    switch( Query.type ) {
        default :
            return require('./db/mysql/setting')(db);

        case 'mongodb':
            return require('./db/mongodb/setting')(db);

    }
};
setGlobalVar( 'settingQuery', settingQuery );

/**
 * Get the setting value base on the given setting name.
 *
 * @param {string} name
 * @returns {Promise<*>}
 */
const getSetting = name => {
    if ( ! name ) {
        return reject( il8n('Setting name is required.') );
    }

    let cache = Cache.get( 'settings', name );
    if ( cache ) {
        return resolve(cache);
    }

    return settingQuery().getSetting(name)
        .then( results => {
            if ( ! results.length ) {
                return undefined;
            }

            let result = results.shift(),
                value = unserialize(result.value);

            Cache.set( 'settings', name, value );

            return value;
        } );
};
setGlobalVar( 'getSetting', getSetting );

/**
 * Set or update setting.
 *
 * @param {string} name
 * @param {string|int|object|array} value
 * @returns {Promise<*>}
 */
const setSetting = (name, value) => {
    if ( ! name ) {
        return reject( il8n('Setting name is required.') );
    }

    Cache.clear( 'settings', name );

    value = serialize(value);

    return settingQuery().setSetting( name, value );
};
setGlobalVar( 'setSetting', setSetting );

/**
 * Delete setting base on the given setting name.
 *
 * @param {string} name
 * @returns {Promise<*>}
 */
const deleteSetting = name => {
    if ( ! name ) {
        return reject( il8n('Setting name is required.') );
    }

    Cache.clear( 'settings', name );

    return settingQuery().deleteSetting(name);
};
setGlobalVar( 'deleteSetting', deleteSetting );