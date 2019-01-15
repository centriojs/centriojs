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

const insertedContentType = async (typeId, contentType, oldType) => {
    // create content type tables
    // set endpoint
    // delete previous endpoint
    await runInVM({
        typeId: typeId,
        contentType: contentType,
        oldType: oldType
    }, './vm/inserted-content-type' );

    return true;
};
appEvent.on( 'insertedContentType', insertedContentType );
appEvent.on( 'updatedContentType', insertedContentType );

const deletedContentType = (typeId, contentType) => {
    runInVM({
        typeId: typeId,
        contentType: contentType
    }, './vm/deleted-content-type' );

    return true;
};
appEvent.on( 'deletedContentType', deletedContentType );

const setTypeProperty = async (typeId, name, value) => {

    if ( 'content_type' === name ) {
        let contentType = await getContentType(value).catch(errorHandler),
            termType = await getContentType(typeId).catch(errorHandler);

        let slugs = [contentType.slug, termType.slug];

        slugs = '/' + slugs.join('/');
        let val = {
            type: 'taxArchive',
            typeId: value,
            taxTypeId: typeId
        };

        setEndPoint( slugs, val ).catch(errorHandler);
    }

    return true;
};
appEvent.on( 'setTypeProperty', setTypeProperty );

const deletedTypeProperty = (typeId, name, value) => {
    if ( 'content_type' === name ) {
        value = _.isArray(value) ? value : [value];

        value.map( async cid => {
            let contentType = await getContentType(cid).catch(errorHandler),
                termType = await getContentType(typeId).catch(errorHandler);

            let slugs = [contentType.slug, termType.slug];
            slugs = '/' + slugs.join('/');

            deleteEndPoint( slugs ).catch(errorHandler);
        });
    }

    return true;
};
appEvent.on( 'deletedTypeProperty', deletedTypeProperty );

const findContentParent = async (slugs, typeId, contentId) => {
    let content = await getContent( typeId, contentId ).catch(errorHandler);
    if ( ! content || content.error ) {
        return slugs;
    }

    if ( content.parent && content.parent > 0 ) {
        slugs = await findContentParent( slugs, typeId, content.parent );
    }

    slugs.push(content.slug);

    return slugs;
};

const setContentPermalink = async (content, typeId) => {
    let contentType = await getContentType(typeId).catch(errorHandler);

    if ( ! contentType || contentType.error || ! contentType.hasPage ) {
        return content;
    }

    Filter.off( 'getContent', setContentPermalink );

    let slugs = [];

    if ( 'pages' !== contentType.slug ) {
        slugs.push(contentType.slug);
    }

    slugs = await findContentParent( slugs, typeId, content.ID );

    content.permalink = '/' + slugs.join('/');

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

const insertedTerm = async (termId, typeId, old) => {
    let termType = await getContentType(typeId).catch(errorHandler);
    if ( ! termType.hasPage ) {
        return false;
    }

    let term = await getTerm( typeId, termId ).catch(errorHandler);

    let typeIds = await getTypeProperty( typeId, 'content_type' );
    typeIds.map( async tid => {
        let type = await getContentType(tid).catch(errorHandler);
        if ( ! type || type.error ) {
            // Bail if content type was removed
            return false;
        }

        if ( old ) {
            let oldSlugs = await findTermParent( [type.slug, old.slug], termId, typeId );
            oldSlugs = '/' + oldSlugs.join('/');
            deleteEndPoint(oldSlugs).catch(errorHandler);
        }


        let slugs = await findTermParent( [type.slug], termId, typeId );
        slugs = '/' + slugs.join('/');

        console.log(slugs);

        let value = {
            type: 'taxPage',
            typeId: tid,
            taxTypeId: typeId,
            termId: termId
        };

        await setEndPoint( slugs, value ).catch(errorHandler);
    });
};
appEvent.on( 'insertedTerm', insertedTerm );
appEvent.on( 'updatedTerm', insertedTerm );

const setContentTerm = async ( contentTypeId, termTypeId, contentId, termIds ) => {
    let termType = await getContentType(termTypeId).catch(errorHandler);
    if ( ! termType.hasPage ) {
        return false;
    }

    let contentType = await getContentType(contentTypeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return false;
    }

    termIds.map( async termId => {
        let term = await getTerm( termTypeId, termId ).catch(errorHandler);

        if ( ! term || term.error ) {
            return false;
        }

        let slugs = await findTermParent( [contentType.slug, termType.slug], termId, termTypeId );
        slugs = '/' + slugs.join('/');

        let value = {
            type: 'termPage',
            typeId: contentTypeId,
            termTypeId: termTypeId,
            termId: termId
        };

        setEndPoint( slugs, value ).catch(errorHandler);
    });

    return true;
};
appEvent.on( 'setContentTerm', setContentTerm );

const deletedContentTerm = async ( contentTypeId, termTypeId, contentId, termIds ) => {
    let termType = await getContentType(termTypeId).catch(errorHandler);

    if ( ! termType.hasPage ) {
        return false;
    }

    let contentType = await getContentType(contentTypeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return false;
    }

    termIds.map( async termId => {
        let term = await getTerm( termTypeId, termId ).catch(errorHandler);

        if ( ! term || term.error ) {
            return false;
        }

        let slugs = await findTermParent( [contentType.slug, termType.slug], termId, termTypeId );
        slugs = '/' + slugs.join('/');

        deleteEndPoint(slugs).catch(errorHandler);
    });

    return true;
};
appEvent.on( 'deletedContentTerm', deletedContentTerm );