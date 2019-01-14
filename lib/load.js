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

const setTypePermalink = async contentType => {
    if ( ! contentType.hasArchive || 'content' !== contentType.type ) {
        return contentType;
    }

    Filter.off( 'getContentType', setTypePermalink );

    contentType.permalink = '/' + contentType.slug;

    Filter.on( 'getContentType', setTypePermalink );

    return contentType;
};
Filter.on( 'getContentType', setTypePermalink );

const setTypeArchive = async (typeId, contentType, oldType) => {
    runInVM({
        typeId: typeId,
        contentType: contentType,
        oldType: oldType
    }, './vm/inserted-content-type' );

    return true;
};
appEvent.on( 'insertedContentType', setTypeArchive );
appEvent.on( 'updatedContentType', setTypePermalink );

const deletedContentType = (typeId, contentType) => {
    runInVM({
        typeId: typeId,
        contentType: contentType
    }, './vm/deleted-content-type' );

    return true;
};
appEvent.on( 'deletedContentType', deletedContentType );

const setContentPermalink = async (content, typeId) => {
    Filter.off( 'getContent', setContentPermalink );

    let permalink = await getContentPermalink( typeId, content.ID );

    if ( ! permalink ) {
        content.permalink = permalink;
    }

    Filter.on( 'getContent', setContentPermalink );

    return content;
};
Filter.on( 'getContent', setContentPermalink );

const setContentRoute = async (contentId, typeId, old) => {
    let oldSlug = old && old.permalink,
        content = await getContent(typeId, contentId);

    if ( ! content.permalink ) {
        if ( oldSlug ) {
            deleteEndPoint(oldSlug).catch(errorHandler);
        }

        return false;
    }

    let value = {
        type: 'content',
        typeId: typeId,
        contentId: contentId
    };

    setEndPoint( content.permalink, value ).catch(errorHandler);

    return true;
};
appEvent.on( 'insertedContent', setContentRoute );
appEvent.on( 'updatedContent', setContentRoute );

// Listen to deleted content of content type
const deletedContent = async (content, typeId) => {
    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return false;
    }

    runInVM({
        typeId: typeId,
        content: content,
        contentType: contentType
    }, './vm/deleted-content' );

    return true;
};
appEvent.on( 'deletedContent', deletedContent );

const findTermParent = async (slugs, ID, typeId) => {
    let term = await getTerm( typeId, ID ).catch(errorHandler);

    if ( term.parent && term.parent > 0 ) {
        slugs = await findTermParent( slugs, term.parent, typeId );
    }

    slugs.push(term.slug);

    return slugs;
};

const setTermPermalink = async ( term, typeId ) => {
    let termType = await getContentType(typeId).catch(errorHandler);
    if ( ! termType.hasPage ) {
        return term;
    }

    Filter.off( 'getTerm', setTermPermalink );

    let slugs = await findTermParent( [termType.slug], term.ID, typeId );

    term.origPermalink = '/' + slugs.join('/');

    Filter.on( 'getTerm', setTermPermalink );

    return term;
};
Filter.on( 'getTerm', setTermPermalink );

const insertedTerm = async (termId, typeId) => {
    let termType = await getContentType(typeId).catch(errorHandler);
    if ( ! termType.hasPage || ! termType.content_types ) {
        return false;
    }

    termType.content_types.map( async type => {

    });
};