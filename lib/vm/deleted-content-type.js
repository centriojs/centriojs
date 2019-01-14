'use strict';

const _ = require('../mixin');

module.exports = async ({typeId, contentType}) => {
    if ( 'tax' === contentType.type ) {
        // Delete all terms
        let terms = await getTerms({typeId: typeId}).catch(returnFalse);
        terms = terms || [];
        terms.map( term => {
            deleteTerm( typeId, term.ID ).catch(errorHandler);
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

        await deleteTypeProperty(typeId).catch(errorHandler);

        await contentTypeQuery().dropContentTables( typeId, contentType ).catch(errorHandler);

        return true;
    }

    let contents = await getContents({typeId: typeId});
    contents = contents || [];

    contents.map( async content => {
        await deleteContent( typeId, content.ID ).catch(errorHandler);
    });

    let taxTypes = await getTypeProperties({name: 'content_type', value: typeId} ).catch(errorHandler);
    taxTypes = _.pluck( taxTypes, 'objectId' );
    taxTypes = taxTypes || [];

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

    await deleteTypeProperty(typeId).catch(errorHandler);

    await contentTypeQuery().dropContentTables( typeId, contentType ).catch(errorHandler);

    await deleteEndPoint( '/' + contentType.slug ).catch(errorHandler);

    return true;
};