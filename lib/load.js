'use strict';

/**
 Loads all files needed to run the application.
 **/
require('./utils');
require('./filesystem');
require('./endpoint');
require('./settings');
require('./user');
require('./preset');
require('./content');
require('./module');
require('./media');
require('./theme');

require('./events/users');
require('./events/content-type');
require('./events/terms');

// Clear cache when active app configuration is changed.
//clearRequireCache( path.resolve( ABSPATH, './config.js' ) );

const setMediaFields = (columns, db, options) => {
    if ( 'media' !== options.slug ) {
        return columns;
    }

    columns = columns.concat([
        '`type` VARCHAR(60) NOT NULL',
        '`name` VARCHAR(150) NOT NULL',
        '`filename` VARCHAR(255) NOT NULL',
        '`alt` VARCHAR(150)',
        '`sizes` LONGTEXT',
        '`caption` VARCHAR(255)'
    ]);

    return columns;
};
Filter.on( 'contentColumnFields', setMediaFields );

const updateMediaFields = (columns, db, options, structure) => {
    if ( 'media' !== options.slug ) {
        return columns;
    }

    if ( ! structure.type ) {
        columns.push('ADD `type` VARCHAR(60) NOT NULL');
    }

    if ( ! structure.name ) {
        columns.push('ADD `name` VARCHAR(150) NOT NULL');
    }

    if ( ! structure.filename ) {
        columns.push('ADD `filename` VARCHAR(255) NOT NULL');
    }

    if ( ! structure.alt ) {
        columns.push('ADD `alt` VARCHAR(150)');
    }

    if ( ! structure.caption ) {
        columns.push('ADD `caption` VARCHAR(255)');
    }

    if ( ! structure.sizes ) {
        columns.push('ADD `sizes` LONGTEXT');
    }

    return columns;
};
Filter.on( 'updateContentColumnFields', updateMediaFields );