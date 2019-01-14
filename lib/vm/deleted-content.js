module.exports = async ({content, typeId, contentType}) => {

    // Delete endpoint
    if ( content.permalink ) {
        await deleteEndPoint(content.permalink).catch(errorHandler);
    }

    if ( contentType.hierarchical ) {
        await getContents({
            typeId: typeId,
            parent: content.ID
        })
            .then( children => {
                if ( children.length ) {
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

    await deleteContentProperty( typeId, content.ID ).catch(errorHandler);

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

    return true;
};