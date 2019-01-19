'use strict';

const path = require('path'),
    Cache = require('./cache'),
    Template = require('./template'),
    _ = require('./mixin');

/**
 * Get the information of the given theme name.
 *
 * @param {string} name
 * @returns {Promise<*>}
 */
const getTheme = async name => {
    let location = path.resolve( ABSPATH, './themes/' + name ),
        cache = Cache.get( '__theme', name );

    if ( cache ) {
        //return cache;
    }

    try {
        const themeInfo = require( location + '/index.js' );

        let files = await readDir( location, true, true, ['html', 'htm'] ).catch(errorHandler);

        if ( !! files && ! files.error ) {
            let templates = {};

            for ( let i = 0; i < files.length; i++ ) {
                let fileObj = files[i];

                await readFile(fileObj.filePath)
                    .then( async data => {
                        let base = fileObj.filePath.replace( location, '' );
                        base = base.replace( /\\/g, '/' ).replace( fileObj.ext, '' );

                        templates[base] = await Template(data);
                    })
                    .catch();
            }

            themeInfo.__templates = templates;
        }

        Cache.set( '__theme', name, themeInfo );

        return themeInfo;
    } catch(e) {
        errorHandler(e);

        return false;
    }
};
setGlobalVar( 'getTheme', getTheme );

/**
 * Returns the information of the current use theme.
 *
 * @returns {Promise<*>}
 */
const getCurrentTheme = async () => {
    let theme = await getSetting( '__currentTheme', 'visual' );

    return getTheme(theme);
};
setGlobalVar( 'getCurrentTheme', getCurrentTheme );

/**
 * Switch the current use theme to given theme.
 *
 * @param {string} name
 * @returns {Promise<*>}
 */
const setCurrentTheme = name => {
    return setSetting( '__currentTheme', name )
        .then( () => {
            // Clear landing pages presets

            return true;
        });
};
setGlobalVar( 'setCurrentTheme', setCurrentTheme );