'use strict';

const _ = require('../mixin');

// Set permalink
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

const contentPermalink = async (content, typeId) => {
    let contentType = await getContentType(typeId).catch(errorHandler);

    Filter.off( 'getContent', setContentPermalink );

    let slugs = [];

    if ( 'pages' !== contentType.slug ) {
        // Only pages type are not prefixed with content type slug
        slugs.push(contentType.slug);
    }

    slugs = await findContentParent( slugs, typeId, content.ID );

    content.permalink = '/' + slugs.join('/');

    Filter.on( 'getContent', setContentPermalink );

    return content;
};
Filter.on( 'getContent', contentPermalink );

// Update content endpoint whenever the content type slug is change.
const updatedContentType2 = async (typeId, contentType, oldType) => {
    if ( contentType.slug === oldType.slug ) {
        return true;
    }

    let contents = await getContents({
        typeId: typeId,
        status__in: ['public', 'private']
    });

    contents.map( async content => {
        let oldSlugs = await findContentParent( [oldType.slug], content.ID, typeId );
        oldSlugs = '/' + oldSlugs.join('/');

        let newSlugs = await findContentParent( [contentType.slug], content.ID, typeId );
        newSlugs = '/' + newSlugs.join('/');

        await setEndPoint( newSlugs, {
            type: 'content',
            typeId: typeId,
            contentId: content.ID
        }, oldSlugs ).catch(errorHandler);
    });

    return true;
};
appEvent.on( 'updatedContentType', updatedContentType2 );

// Listen to content update/insertion
const insertedContent = async (contentId, typeId, old) => {
    let content = await getContent( typeId, contentId );

    if ( old && old.permalink !== content.permalink ) {
        await deleteEndPoint(old.permalink).catch(errorHandler);
    }

    // Set endpoint
    if ( ! old || old.permalink !== content.permalink ) {
        await setEndPoint( content.permalink, {
            type: 'content',
            typeId: typeId,
            contentId: contentId
        }).catch(errorHandler);
    }

    return true;
};
appEvent.on( 'insertedContent', insertedContent );
appEvent.on( 'updatedContent', insertedContent );

// Listen to content type deletion
const deletedContent = async (content, typeId) => {
    // Delete endpoint
    await deleteEndPoint(content.permalink).catch(errorHandler);

    let contentType = await getContentType(typeId).catch(errorHandler);

    // Update content children
    if ( contentType.hierarchical ) {
        await getContents({
            typeId: typeId,
            parent: content.ID
        })
            .then( children => {
                if ( children.length ) {
                    // @todo: Check if parent is updated
                    children.map( child => {
                        updateContent({
                            typeId: typeId,
                            ID: child.ID,
                            parent: 0
                        })
                            .catch(errorHandler);
                    })
                }

                return true;
            } )
            .catch(errorHandler);
    }

    // Delete content's comments
    if ( contentType.hasComments ) {
        await getComments({
            typeId: typeId,
            contentId: content.ID
        })
            .then( async comments => {
                if ( ! comments.length ) {
                    return true;
                }

                for( let i = 0; i < comments.length; i++ ) {
                    let comment = comments[i];

                    await deleteComment( typeId, comment.ID ).catch(errorHandler);
                }

                return true;
            })
            .catch(errorHandler);
    }

    // Delete properties
    await deleteContentProperty( typeId, content.ID ).catch(errorHandler);

    return true;
};
appEvent.on( 'deletedContent', deletedContent );