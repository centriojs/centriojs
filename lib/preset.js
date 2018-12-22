'use strict';

const Cache = require('./cache'),
    _ = require('./mixin');

/**
 * Returns an instance of PresetQuery
 *
 * @param {object} db
 * @returns {PresetQuery}
 */
const presetQuery = db => {
    if ( ! db ) {
        db = dbManager;
    }

    let Query = db.execQuery('presets');

    switch( Query.type ) {
        default :
            return require('./db/mysql/preset')(db);
    }
};
setGlobalVar( 'presetQuery', presetQuery );

/**
 * Add new preset data to the database.
 *
 * @param {object} preset {
 *     @param {string} name                 The preset's name identifier.
 *     @param {string} type                 The type of preset current being save. Types are template, module, and menu.
 *     @param {string} location             The container location or template of the selected type.
 *     @param {string} contentType          The content type the preset will be use at. Default is `global`.
 *     @param {object} properties           Optional. Use in template type of preset.
 *     @param {object} modules              Optional. The active modules use.
 *     @param {object} menu                 Optional. The list of menus enabled.
 * }
 * @returns {Promise<*>}
 */
const addPreset = preset => {
    let {name, type, location} = preset;

    if ( ! name ) {
        return reject( il8n('Preset name is required.') );
    }

    if ( ! type ) {
        return reject( il8n('Preset type is required.') );
    }

    if ( ! location ) {
        return reject( il8n('No preset location set.') );
    }

    if ( ! preset.contentType ) {
        preset.contentType = 'global'; // Default to global
    }

    Cache.clearGroup( 'presets' );

    return presetQuery().insert(preset);
};
setGlobalVar( 'addPreset', addPreset );

/**
 * Update preset data base on the given preset ID.
 *
 * @param {object} preset {
 *     @param {int} ID                      Required. The id of the preset to update to.
 *     @param {string} name                 The preset's name identifier.
 *     @param {string} type                 The type of preset current being save. Types are template, module, and menu.
 *     @param {string} location             The container location or template of the selected type.
 *     @param {string} contentType          The content type the preset will be use at. Default is `global`.
 *     @param {object} properties           Optional. Use in template type of preset.
 *     @param {object} modules              Optional. The active modules use.
 *     @param {object} menu                 Optional. The list of menus enabled.
 * }
 * @returns {Promise<*>}
 */
const updatePreset = preset => {
    let {ID} = preset;

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid preset ID.') );
    }

    Cache.clear( 'preset', ID );
    Cache.clearGroup( 'presets' );

    return presetQuery().update(preset);
};
setGlobalVar( 'updatePreset', updatePreset );

/**
 * Delete preset from the database base on the given ID.
 *
 * @param {int} ID          The id of the preset to delete to.
 * @returns {Promise<*>}
 */
const deletePreset = ID => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid preset ID.') );
    }

    Cache.clear( 'preset', ID );
    Cache.clearGroup( 'presets' );

    return presetQuery().delete(ID);
};
setGlobalVar( 'deletePreset', deletePreset );

/**
 * Get the preset data of the given preset ID.
 *
 * @param {int} ID              The id of the preset to retrieve the date from the database.
 * @returns {Promise<*>}
 */
const getPreset = ID => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('') );
    }

    let cache = Cache.get( 'preset', ID );
    if ( cache ) {
        return resolve(cache);
    }

    return presetQuery().get(ID)
        .then( preset => {
            if ( ! preset ) {
                return undefined;
            }

            Cache.set( 'preset', ID, preset );

            return preset;
        });
};
setGlobalVar( 'getPreset', getPreset );

/**
 * Get the list of presets data base on the set query parameters.
 *
 * @param {object|null} query {
 *     @param {string} type
 *     @param {array} type__in
 *     @param {string} location
 *     @param {array} location__in
 *     @param {string} contentType
 *     @param {array} contentType__in
 * }
 * @returns {*}
 */
const getPresets = query => {
    let keys = [];

    if ( query.type ) {
        keys.push(query.type);
    } else if ( query.type__in ) {
        keys.push(query.type__in.join('-'));
    }

    if ( query.location ) {
        keys.push(query.location);
    } else if ( query.location__in ) {
        keys.push( query.location__in.join('-') );
    }

    if ( query.contentType ) {
        keys.push(query.contentType);
    } else if ( query.contentType__in ) {
        keys.push( query.contentType__in.join('-') );
    }

    let {page, perPage} = query;
    page = page || 1;
    if ( perPage > 0 ) {
        keys.push(page + '-'+ perPage);
    }

    let key = keys.join('-'),
        cache = Cache.get( 'presets', key );

    if (cache) {
        return resolve(cache);
    }

    return presetQuery().query(query)
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            let presets = [];

            results.map( preset => {
                presets.push(preset);

                Cache.set( 'preset', preset.ID, preset );
            });

            Cache.set( 'presets', key, presets );

            return presets;
        });
};
setGlobalVar( 'getPresets', getPresets );