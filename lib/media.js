'use strict';

const getMediaObject = () => {
    return getContentTypeBy( 'slug', 'media' ).catch(errorHandler);
};

const addMedia = async media => {
    let {name, type, filename} = media;

    if ( ! name ) {
        return reject( il8n('Missing required value for column `name`.') );
    }

    if ( ! filename ) {
        return reject( il8n('Missing required value for column `filename`.') );
    }

    if ( ! type ) {
        return reject( il8n('Missing media type.') );
    }

    media = await Filter.apply( 'preInsertedMedia', media );

    let contentType = await getMediaObject();

    return addContent( contentType.ID, media )
        .then( async id => {
            await Filter.apply( 'insertedMedia', id, media );

            return id;
        });
};
setGlobalVar( 'addMedia', addMedia );

const updateMedia = async media => {
    let {ID} = media;

    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid media id.') );
    }

    let contentType = await getMediaObject(),
        old = await getMedia(ID).catch(errorHandler);

    if ( ! old || old.error ) {
        return addMedia(media);
    }

    media = await Filter.apply( 'preUpdatedMedia', media, old );

    return updateContent( contentType.ID, media )
        .then( async () => {
            await Filter.apply( 'updatedMedia', ID, media, old );

            return ID;
        });
};
setGlobalVar( 'updateMedia', updateMedia );

const deleteMedia = async ID => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid media id.') );
    }

    let contentType = await getMediaObject(),
        old = await getMedia(ID).catch(errorHandler);

    if ( ! old || old.error ) {
        return reject( il8n('Invalid media id.') );
    }

    return deleteContent( contentType.ID, ID )
        .then( async () => {
            await appEvent.trigger( 'deletedMedia', ID, old );

            return true;
        });
};
setGlobalVar( 'deleteMedia', deleteMedia );

const getMedia = async ID => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid media id.') );
    }

    let contentType = await getMediaObject();

    return getContent( contentType.ID, ID );
};
setGlobalVar( 'getMedia', getMedia );

const getMediaList = async query => {
    let contentType = await getMediaObject();
    query.typeId = contentType.ID;

    return getContents( query );
};
setGlobalVar( 'getMediaList', getMediaList );