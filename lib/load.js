'use strict';

const path = require('path');

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

// Clear cache when active app configuration is changed.
//clearRequireCache( path.resolve( ABSPATH, './config.js' ) );

const setTypePermalink = async contentType => {
    if ( ! contentType.public || ! contentType.hasArchive ) {
        return contentType;
    }

    Filter.off( 'getContentType', setTypePermalink );

    contentType.permalink = await getArchivePermalink(contentType.ID);

    Filter.on( 'getContentType', setTypePermalink );

    return contentType;
};
Filter.on( 'getContentType', setTypePermalink );

const setTypeArchive = async (typeId, options, old) => {
    let oldSlug;

    if ( old && old.hasArchive ) {
        oldSlug = '/' + old.slug;
    }

    if ( ! options.public || ! options.hasArchive ) {
        if ( oldSlug ) {
            deleteEndPoint(oldSlug).catch(errorHandler);
        }

        return true;
    }

    let value = {
        type: 'archive',
        typeId: typeId
    };

    setEndPoint( '/' + options.slug, value ).catch(errorHandler);

    return true;
};
appEvent.on( 'insertedContentType', setTypeArchive );
appEvent.on( 'updatedContentType', setTypePermalink );

const deleteTypeArchive = (typeId, options) => {
    if ( ! options.public || ! options.hasArchive ) {
        return false;
    }

    deleteEndPoint('/' + options.slug).catch(errorHandler);

    return true;
};
appEvent.on( 'deletedContentType', deleteTypeArchive );

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

const deleteContentRoute = content => {
    if ( ! content.permalink ) {
        return false;
    }

    deleteEndPoint(content.permalink).catch(errorHandler);

    return true;
};
appEvent.on( 'deletedContent', deleteContentRoute );

const findCatParent = async (slugs, catId, typeId) => {
    let category = await getCategory( typeId, catId ).catch(errorHandler);

    if ( ! category || category.error ) {
        return slugs;
    }

    if ( category.parent && category.parent > 0 ) {
        slugs = await findCatParent( slugs, category.parent, typeId );
    }

    slugs.push(category.slug);

    return slugs;
};

const setCategoryPermalink = async (category, typeId) => {
    let contentType = await getContentType(typeId).catch(errorHandler);

    if ( ! contentType || contentType.error || ! contentType.public ) {
        return category;
    }

    Filter.off( 'getCategory', setCategoryPermalink );

    let slug = await findCatParent( [contentType.slug], category.ID, typeId );
    slug = '/' + slug.join('/');

    category.permalink = slug;

    Filter.on( 'getCategory', setCategoryPermalink );

    return category;
};
Filter.on( 'getCategory', setCategoryPermalink );

const setCategoryRoute = async (catId, typeId, old) => {
    let oldSlug = old && old.permalink,
        category = await getCategory(typeId, catId).catch(errorHandler);

    if ( ! category || category.error || ! category.permalink ) {
        if ( oldSlug ) {
            deleteEndPoint(oldSlug).catch(errorHandler);
        }

        return false;
    }

    let value = {
        type: 'category',
        typeId: typeId,
        catId: category.ID
    };

    setEndPoint( category.permalink, value ).catch(errorHandler);

    return true;
};
appEvent.on( 'insertedCategory', setCategoryRoute );
appEvent.on( 'updatedCategory', setCategoryRoute );

const deleteCategoryRoute = category => {
    if ( ! category.permalink ) {
        return true;
    }

    deleteEndPoint(category.permalink).catch(errorHandler);

    return true;
};
appEvent.on( 'deletedCategory', deleteCategoryRoute );

const findTagParent = async (slugs, tagId, typeId) => {
    let tag = await getCategory( typeId, tagId ).catch(errorHandler);

    if ( ! tag || tag.error  ) {
        return slugs;
    }

    if ( tag.parent && tag.parent > 0 ) {
        slugs = await findCatParent( slugs, tag.parent, typeId );
    }

    slugs.push(tag.slug);

    return slugs;
};

const setTagPermalink = async (tag, typeId) => {
    let contentType = await getContentType(typeId).catch(errorHandler);

    if ( ! contentType || contentType.error || ! contentType.public ) {
        return tag;
    }

    Filter.off( 'getTag', setTagPermalink );

    let slug = await findTagParent( [contentType.slug], tag.ID, typeId );
    slug = '/' + slug.join('/');

    tag.permalink = slug;

    Filter.on( 'getTag', setTagPermalink );

    return tag;
};
Filter.on( 'getTag', setTagPermalink );

const setTagRoute = async (tagId, typeId, old) => {
    let oldSlug = old && old.permalink,
        tag = await getTag( typeId, tagId ).catch(errorHandler);

    if ( ! tag || tag.error ) {
        if ( oldSlug ) {
            deleteEndPoint(oldSlug).catch(errorHandler);
        }

        return false;
    }

    let value = {
        type: 'tag',
        typeId: typeId,
        tagId: tagId
    };

    setEndPoint( tag.permalink, value, oldSlug ).catch(errorHandler);

    return true;
};
appEvent.on( 'insertedTag', setTagRoute );
appEvent.on( 'updatedTag', setTagRoute );

const deleteTagRoute = tag => {
    if ( ! tag.permalink ) {
        return false;
    }

    deleteEndPoint(tag.permalink).catch(errorHandler);

    return true;
};
appEvent.on( 'deletedTag', deleteTagRoute );