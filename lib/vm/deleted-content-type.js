module.exports = async ({typeId, contentType}) => {

    if ( contentType.permalink ) {
        await deleteEndPoint(contentType.permalink).catch(errorHandler);
    }

    await contentTypeQuery().dropContentTables( typeId, contentType ).catch(errorHandler);

    return true;
};