'use strict';

const Cache = require('./cache'),
    _ = require('./mixin');

/**
 * Returns an instance of ContentTypeQuery.
 *
 * @param {object} db
 * @returns {ContentTypeQuery}
 */
const contentTypeQuery = db => {
    if ( ! db ) {
        db = dbManager;
    }

    let Query = db.execQuery('content_types');

    switch( Query.type ) {
        default :
            return require('./db/mysql/content-type')(db);

        case 'mongodb':
            return require('./db/mongodb/content-type')(db);
    }
};
setGlobalVar( 'contentTypeQuery', contentTypeQuery );

/**
 * Add new content type to the database.
 *
 * @param {object} options {
 *     @param {string} name             The unique name identifier of the content type.
 *     @param {boolean} public          Whether contents of this type have public viewing.
 *     @param {string} status           The status [active|inactive] to which the content type will be inserted like. Defaults `active`.
 *     @param {boolean} hasCategories   Whether contents of this type can be group into categories.
 *     @param {boolean} hasTag          Whether contents of this type can be group into tags.
 *     @param {boolean} hasArchive      Whether contents of this type will be archive for public viewing.
 *     @param {int} archiveTemplate     The preset ID created for this contents archive visualization.
 *     @param {int} categoryTemplate    The preset ID created for this contents per category viewing.
 *     @param {int} tagTemplate         The preset ID created for this contents per tag viewing.
 *     @param {string} slug             A unique slug use to prefix the content/s permalink structure.
 *     @param {array} fields            An array of fields use to create the contents of this type.
 * }
 * @returns {Promise<*>}
 */
const addContentType = options => {
    let {name} = options;

    if ( ! name ) {
        return reject( il8n('No content type name.') );
    }

    if ( ! options.status ) {
        options.status = 'active';
    }

    if ( ! options.fields ) {
        options.fields = ['title', 'summary', 'content', 'author', 'featured'];

        if ( options.public ) {
            options.fields.push('slug');
        }
    }

    return contentTypeQuery().insert(options);
};
setGlobalVar( 'addContentType', addContentType );

/**
 * Update content type base on the given options.
 *
 * @param {object} options {
 *     @param {int} ID                  Required. The content type id to update the data to.
 *     @param {string} name             Optional. The unique name identifier of the content type.
 *     @param {boolean} public          Optional. Whether contents of this type have public viewing.
 *     @param {string} status           Optional. The status [active|inactive] to which the content type will be inserted like.
 *     @param {boolean} hasCategories   Optional. Whether contents of this type can be group into categories.
 *     @param {boolean} hasTag          Optional. Whether contents of this type can be group into tags.
 *     @param {boolean} hasArchive      Optional. Whether contents of this type will be archive for public viewing.
 *     @param {int} archiveTemplate     Optional. The preset ID created for this contents archive visualization.
 *     @param {int} categoryTemplate    Optional. The preset ID created for this contents per category viewing.
 *     @param {int} tagTemplate         Optional. The preset ID created for this contents per tag viewing.
 *     @param {string} slug             Optional. A unique slug use to prefix the content/s permalink structure.
 *     @param {array} fields            Optional. An array of fields use to create the contents of this type.
 * }
 * @returns {Promise<*>}
 */
const updateContentType = options => {
    let {ID} = options;

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid content type ID.') );
    }

    Cache.clear( 'contentType', ID );

    return contentTypeQuery().update(options);
};
setGlobalVar( 'updateContentType', updateContentType );

/**
 * Get the content type data base on the given ID.
 *
 * @param {int} ID          Required. The content type id to get the data from.
 * @returns {Promise<*>}
 */
const getContentType = ID => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid content type ID.') );
    }

    let cache = Cache.get( 'contentType', ID );
    if ( cache ) {
        return resolve(cache);
    }

    return contentTypeQuery().get(ID)
        .then( content => {
            Cache.set( 'contentType', ID );

            return content;
        });
};
setGlobalVar( 'getContentType', getContentType );

/**
 * Remove content type data from the database.
 *
 * @param {int} ID              Required. The content type id to remove the data from.
 * @returns {Promise<*>}
 */
const deleteContentType = ID => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid content type ID.') );
    }

    Cache.clear( 'contentType', ID );

    return contentTypeQuery().delete(ID)
        .then( ok => {
            // @todo: trigger action here

            return ok;
        });
};
setGlobalVar( 'deleteContentType', deleteContentType );

/**
 * Get the list of content types base on the given filter.
 *
 * @param {object} filter {
 *     @param {boolean} public              Optional. Whether to get only public content types.
 *     @param {string} status               Optional. The content type status to retrieve at.
 *     @param {boolean} hasCategories       Optional. Whether to get only content types that categories is enabled.
 *     @param {boolean} hasTag              Optional. Whether to get only content types where tags is enabled.
 *     @param {int} page                    Optional. The page number use to paginate between content types.
 *     @param {int} perPage                 Optional. The number of content types to retrieve at.
 * }
 * @returns {Promise<*>}
 */
const getContentTypes = filter => {
    filter = filter || {};

    let keys = _.values(filter),
        key = false;

    if ( keys && keys.length ) {
        key = keys.join('-');

        let cache = Cache.get( 'contentTypes', key );
        if ( cache ) {
            return resolve(cache);
        }
    }

    return contentTypeQuery().getContentTypes(filter)
        .then( results => {
            results.map( result => {
                Cache.set( 'contentType', result.ID, result );
            });

            if ( key ) {
                Cache.set( 'contentTypes', key, results );
            }

            return results;
        });
};
setGlobalVar( 'getContentTypes', getContentTypes );