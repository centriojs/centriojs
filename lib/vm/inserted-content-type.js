module.exports = async ({typeId, contentType, oldType}) => {
    if ( oldType && oldType.permalink ) {
        await deleteEndPoint(oldType.permalink).catch(errorHandler);
    }

    if ( contentType.hasArchive ) {
        let value = {
            type: 'archive',
            typeId: typeId
        };

        setEndPoint( '/' + contentType.slug, value ).catch(errorHandler);
    }

    if ( ! oldType ) {
        await contentTypeQuery().createContentTables( typeId, contentType ).catch(errorHandler);
    } else {
        await contentTypeQuery().updateContentTable( typeId, contentType ).catch(errorHandler);
    }

    return true;
};