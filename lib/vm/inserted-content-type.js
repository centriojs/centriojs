'use strict';

const _ = require('../mixin');

module.exports = async ({typeId, contentType, oldType}) => {
    if ( ! oldType ) {
        await contentTypeQuery().createContentTables( typeId, contentType ).catch(errorHandler);
    } else {
        await contentTypeQuery().updateContentTable( typeId, contentType ).catch(errorHandler);
    }

    if ( oldType ) {
        if ( 'tax' === oldType.type ) {
            await deleteEndPoint( '/' + oldType.slug ).catch(errorHandler);

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
        } else {
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
    }

    if ( 'tax' === contentType.type ) {
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

        return true;
    }

    await setEndPoint( '/' + contentType.slug, {
        type: 'archive',
        typeId: typeId
    } ).catch(errorHandler);

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

    return true;
};