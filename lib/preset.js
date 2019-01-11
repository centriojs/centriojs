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

        case 'mongodb' :
            return require('./db/mongodb/preset')(db);
    }
};
setGlobalVar( 'presetQuery', presetQuery );

/**
 * Add new preset data to the database.
 *
 * @param {object} preset {
 *     @param {string} name                 The preset's name identifier.
 *     @param {string} type                 The type of preset current being save. Types are component, module, and menu.
 *     @param {string} location             The container location use to display the visualization or a selected page component.
 *     @param {string} contentType          The content type the preset will be use at. Default is `global`.
 *     @param {object} properties           Optional. Use in component type of preset.
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

    return presetQuery().insert(preset)
        .then( id => {
            Cache.clearGroup( 'presets' );

            return id;
        });
};
setGlobalVar( 'addPreset', addPreset );

/**
 * Update preset data base on the given preset ID.
 *
 * @param {object} preset {
 *     @param {int} ID                      Required. The id of the preset to update to.
 *     @param {string} name                 The preset's name identifier.
 *     @param {string} type                 The type of preset current being save. Types are component, module, and menu.
 *     @param {string} location             The container location or component of the selected type.
 *     @param {string} contentType          The content type the preset will be use at. Default is `global`.
 *     @param {object} properties           Optional. Use in component type of preset.
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

    return presetQuery().update(preset)
        .then( () => {
            Cache.clear( 'preset', ID );
            Cache.clearGroup( 'presets' );

            return ID;
        });
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

    return presetQuery().delete(ID)
        .then( () => {
            Cache.clear( 'preset', ID );
            Cache.clearGroup( 'presets' );

            return true;
        });
};
setGlobalVar( 'deletePreset', deletePreset );

/**
 * Get the preset data of the given preset ID.
 *
 * @param {int} ID              The id of the preset to retrieve the date from the database.
 *
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
    query = query || {};

    let key = generateKey(query),
        cache = Cache.get( 'presets', key );

    if (cache) {
        return resolve(cache);
    }

    return presetQuery().query(query)
        .then( results => {
            if ( ! results.length ) {
                return [];
            }

            let presets = [];

            results.map( preset => {
                presets.push(preset);

                Cache.set( 'preset', preset.ID, preset );
            });

            Cache.set( 'presets', key, presets );

            return presets;
        })
        .catch( err => {
            errorHandler(err);

            return [];
        });
};
setGlobalVar( 'getPresets', getPresets );