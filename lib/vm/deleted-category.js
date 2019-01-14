module.exports = async ({category, typeId, name}) => {
    if ( ! category.permalink ) {
        return true;
    }

    await deleteEndPoint(category.permalink).catch(errorHandler);

    await contentTypeQuery().getPropertiesBy( typeId, 'name', name )
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            results.map( prop => {
                contentQuery().deleteContentProperty( typeId, prop.contentId, name, category.ID );
            });

            return true;
        })
        .catch(errorHandler);

    return true;
};