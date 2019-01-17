'use strict';

const _ = require('../mixin');

// Set permalink whenever a content type of type content is retrieve
const contentTypePermalink = contentType => {
    if ( ! contentType.hasArchive || 'content' !== contentType.type ) {
        return contentType;
    }

    contentType.permalink = '/' + contentType.slug;

    return contentType;
};
Filter.on( 'getContentType', contentTypePermalink );

// Listen to content type update/insertion of type content
const insertedContentType = async (typeId, contentType) => {
    if ( 'tax' === contentType ) {
        return true;
    }

    if ( contentType.hasArchive ) {
        // Set endpoint
        await setEndPoint( '/' + contentType.slug, {
            type: 'archive',
            typeId: typeId
        } ).catch(errorHandler);

        // Set or reset endpoint of tax type that uses this content type
        let taxTypes = await getTypeProperties({name: 'content_type', value: typeId} );
        taxTypes = _.pluck( taxTypes, 'objectId' );

        taxTypes.map( async taxId => {
            let taxType = await getContentType(taxId).catch(errorHandler);
            if ( ! taxType || taxType.error || ! taxType.hasArchive ) {
                //Bail if the tax type no longer exist or archive is disabled
                return false;
            }

            let slugs = [contentType.slug, taxType.slug];
            slugs = '/' + slugs.join('/');

            let value = {
                type: 'taxArchive',
                typeId: typeId,
                taxTypeId: taxId
            };

            await setEndPoint( slugs, value ).catch(errorHandler);
        });
    }

    // Create tables
    await contentTypeQuery().createContentTables( typeId, contentType ).catch(errorHandler);
};
appEvent.on( 'insertedContentType', insertedContentType, 999 );

const updatedContentType = async (typeId, contentType, oldType) => {
    if ( 'tax' === contentType ) {
        return true;
    }

    if ( oldType.hasArchive && contentType.slug !== oldType.slug ) {
        // Delete endpoint
        await deleteEndPoint( '/' + oldType.slug ).catch(errorHandler);

        let typeIds = await getTypeProperty( oldType.ID, 'content_type' );

        typeIds.map( async tid => {
            let type = await getContentType(tid).catch(errorHandler);
            if ( ! type || type.error ) {
                // Bail if content type was removed
                return false;
            }

            let slugs = [type.slug, oldType.slug];
            slugs = '/' + slugs.join('/');

            await deleteEndPoint( slugs ).catch(errorHandler);
        });
    }

    if ( contentType.hasArchive && contentType.slug !== oldType.slug ) {
        // Set endpoint
        await setEndPoint( '/' + contentType.slug, {
            type: 'archive',
            typeId: typeId
        } ).catch(errorHandler);

        // Set or reset endpoint of tax type that uses this content type
        let taxTypes = await getTypeProperties({name: 'content_type', value: typeId} );
        taxTypes = _.pluck( taxTypes, 'objectId' );

        taxTypes.map( async taxId => {
            let taxType = await getContentType(taxId).catch(errorHandler);
            if ( ! taxType || taxType.error || ! taxType.hasArchive ) {
                //Bail if the tax type no longer exist or archive is disabled
                return false;
            }

            let slugs = [contentType.slug, taxType.slug];
            slugs = '/' + slugs.join('/');

            let value = {
                type: 'taxArchive',
                typeId: typeId,
                taxTypeId: taxId
            };

            await setEndPoint( slugs, value ).catch(errorHandler);

            // Update terms endpoint
        });
    }

    // Update tables
    await contentTypeQuery().updateContentTable( typeId, contentType ).catch(errorHandler);
};
appEvent.on( 'updatedContentType', updatedContentType, 999 );

// Listen to content type deletion of type content
const deletedContentType = async (typeId, contentType) => {
    // Delete endpoint
    await deleteEndPoint( '/' + contentType.slug ).catch(errorHandler);

    // Delete tax type endpoints
    let taxTypes = await getTypeProperties({name: 'content_type', value: typeId} );
    taxTypes = _.pluck( taxTypes, 'objectId' );

    taxTypes.map( async taxId => {
        let taxType = await getContentType(taxId).catch(errorHandler);
        if ( ! taxType || taxType.error || ! taxType.hasArchive ) {
            //Bail if the tax type no longer exist or archive is disabled
            return false;
        }

        let slugs = [contentType.slug, taxType.slug];
        slugs = '/' + slugs.join('/');

        await deleteEndPoint(slugs).catch(errorHandler);
    });

    // Delete contents
    let contents = await getContents({typeId: typeId});
    contents = contents || [];

    contents.map( async content => {
        await deleteContent( typeId, content.ID ).catch(errorHandler);
    });

    // Delete properties
    await deleteTypeProperty(typeId).catch(errorHandler);

    // Delete tables
    await contentTypeQuery().dropContentTables( typeId, contentType ).catch(errorHandler);
};
appEvent.on( 'deletedContentType', deletedContentType, 999 );

// Listen to content type update/insertion of type tax
const insertedTaxType = async (typeId, contentType) => {
    if ( 'tax' !== contentType.type ) {
        return true;
    }

    if ( contentType.hasArchive ) {
        let typeIds = await getTypeProperty( typeId, 'content_type' );

        typeIds.map( async tid => {
            let type = await getContentType(tid).catch(errorHandler);
            if ( ! type || type.error ) {
                // Bail if content type was removed
                return false;
            }

            let slugs = [type.slug, contentType.slug];
            slugs = '/' + slugs.join('/');

            let value = {
                type: 'taxArchive',
                typeId: tid,
                taxTypeId: typeId
            };

            await setEndPoint( slugs, value ).catch(errorHandler);
        });
    }

    // Create tables
    await contentTypeQuery().createContentTables( typeId, contentType ).catch(errorHandler);
};
appEvent.on( 'insertedContentType', insertedTaxType, 999 );

const updatedTaxType = async (typeId, contentType, oldType) => {
    // Check old type
    if ( 'tax' === oldType.type
        && oldType.hasArchive
        && oldType.slug !== contentType.slug ) {

        let taxTypes = await getProperties({name: 'content_type', value: oldType.ID} );
        taxTypes = _.pluck( taxTypes, 'objectId' );

        taxTypes.map( async taxId => {
            let taxType = await getContentType(taxId).catch(errorHandler);
            if ( ! taxType || taxType.error || ! taxType.hasArchive ) {
                //Bail if the tax type no longer exist or archive is disabled
                return false;
            }

            let slugs = [oldType.slug, taxType.slug];
            slugs = '/' + slugs.join('/');

            await deleteEndPoint( slugs, value ).catch(errorHandler);
        });
    }

    if ( contentType.hasArchive
        && ( oldType.type === contentType.type || oldType.slug !== contentType.slug ) ) {
        let typeIds = await getTypeProperty( typeId, 'content_type' );

        typeIds.map( async tid => {
            let type = await getContentType(tid).catch(errorHandler);
            if ( ! type || type.error ) {
                // Bail if content type was removed
                return false;
            }

            let slugs = [type.slug, contentType.slug];
            slugs = '/' + slugs.join('/');

            let value = {
                type: 'taxArchive',
                typeId: tid,
                taxTypeId: typeId
            };

            await setEndPoint( slugs, value ).catch(errorHandler);
        });
    }

    // Update tables
    await contentTypeQuery().updateContentTable( typeId, contentType ).catch(errorHandler);
};
appEvent.on( 'updatedContentType', updatedTaxType, 999 );

// Listen to content type deletion of type tax
const deletedTaxType = async (typeId, contentType) => {
    if ( 'tax' !== contentType ) {
        return false;
    }

    // Delete all terms
    let terms = await getTerms({typeId: typeId});
    terms.map( async term => {
        await deleteTerm( typeId, term.ID ).catch(errorHandler);
    } );

    // Delete archive endpoints
    let typeIds = await getTypeProperty( typeId, 'content_type' );
    typeIds = typeIds || [];
    typeIds.map( async tid => {
        let type = await getContentType(tid).catch(errorHandler);
        if ( ! type || type.error ) {
            // Bail if content type was removed
            return false;
        }

        let slugs = [type.slug, contentType.slug];
        slugs = '/' + slugs.join('/');

        await deleteEndPoint(slugs).catch(errorHandler);
    });

    // Delete properties
    await deleteTypeProperty(typeId).catch(errorHandler);

    // Delete tables
    await contentTypeQuery().dropContentTables( typeId, contentType ).catch(errorHandler);
};
appEvent.on( 'deletedContentType', deletedTaxType, 999 );

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