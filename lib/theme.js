'use strict';

const path = require('path'),
    Cache = require('./cache'),
    _ = require('./mixin');

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

            console.log(files);

            files.map( fileObj => {

            });

            //themeInfo.__templates = files;
        }

        Cache.set( '__theme', name, themeInfo );

        return themeInfo;
    } catch(e) {
        errorHandler(e);

        return false;
    }
};
setGlobalVar( 'getTheme', getTheme );

const getCurrentTheme = async () => {
    let theme = await getSetting( '__currentTheme', 'visual' );

    return getTheme(theme);
};
setGlobalVar( 'getCurrentTheme', getCurrentTheme );

const setCurrentTheme = name => {
    return setSetting( '__currentTheme', name )
        .then( () => {
            // Clear landing pages presets

            return true;
        });
};
setGlobalVar( 'setCurrentTheme', setCurrentTheme );