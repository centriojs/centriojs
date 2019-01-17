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
 * @param {string} name                 The name of the setting to get to.
 * @param {any} $default                The value to return if there's no setting configured.
 *
 * @returns {Promise<*>}
 */
const getSetting = ( name, $default ) => {
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
                return $default;
            }

            let result = results.shift(),
                value = unserialize(result.value);

            Cache.set( 'settings', name, value );

            return value;
        } )
        .catch( err => {
            // Log error if applicable but return the defaults
            errorHandler(err);

            return $default;
        });
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

    value = serialize(value);

    return settingQuery().setSetting( name, value )
        .then( () => {
            Cache.clear( 'settings', name );

            return true;
        });
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

    return settingQuery().deleteSetting(name)
        .then( () => {
            Cache.clear('settings', name );

            return true;
        });
};
setGlobalVar( 'deleteSetting', deleteSetting );

let $default = {
    appName: 'CentrioJS',
    tagline: 'Leading',
    userType: 'multi',
    defaultGroup: 'subscriber',
    restfulApi: true,
    restEndPoint: 'api/v1',
    restSubDomain: false,
    restDomain: ''
};

const getAppSetting = () => {
    return getSetting( 'appConfig' )
        .then( settings => {
            if ( ! settings ) {
                return $default;
            }

            settings = _.extend( {}, $default, settings );

            return settings;
        })
        .catch( err => {
            errorHandler(err);

            return $default;
        });
};
setGlobalVar( 'getAppSetting', getAppSetting );

const updateAppSetting = settings => {
    return setSetting( 'appConfig', settings );
};
setGlobalVar( 'updateAppSetting', updateAppSetting );

const settingPages = {};

const setSettingPage = settings => {
    let {name} = settings;

    if ( ! name ) {
        return false;
    }

    settingPages[name] = settings;
};
setGlobalVar( 'setSettingPage', setSettingPage );

const getSettingPages = async () => {
    /**
     * Fire before return the list of setting pages.
     *
     * @param {object} settingPages
     */
    return Filter.apply( 'adminSettingPages', settingPages );
};
setGlobalVar( 'getSettingPages', getSettingPages );