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
 *     @param {array} fields            An array of fields use to create the contents of this type. Default fields
 *                                      options are title, slug (public must be true), summary, content, and author.
 * }
 * @returns {Promise<*>}
 */
const addContentType = options => {
    let {name, slug} = options;

    if ( ! name ) {
        return reject( il8n('No content type name.') );
    }

    if ( ! slug ) {
        options.slug = _.toSlug(name);
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

    return contentTypeQuery().insert(options)
        .then( async ID => {
            Cache.clearGroup( 'contentTypes' );

            /**
             * Trigger whenever a new content type is inserted to the database.
             *
             * @param {int} ID              The id assigned to the newly inserted content type.
             * @param {object} options      The content type option properties.
             */
            await appEvent.trigger( 'insertedContentType', ID, options );

            return ID;
        });
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
const updateContentType = async options => {
    let {ID} = options;

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid content type ID.') );
    }

    if ( options.fields ) {
        options.fields = serialize(options.fields);
    }

    let old = await getContentTypeBy( 'ID', ID ).catch(errorHandler);
    if ( ! old || old.error ) {
        return reject( il8n('Invalid content type.') );
    }

    return contentTypeQuery().update(options)
        .then( () => {
            Cache.clear( 'contentType', ID );
            Cache.clear( 'contentType', old.slug );
            Cache.clearGroup( 'contentTypes' );

            /**
             * Trigger whenever a content type is updated.
             *
             * @param {int} ID
             */
            appEvent.trigger( 'updatedContentType', ID, options );

            return ID;
        });
};
setGlobalVar( 'updateContentType', updateContentType );

/**
 * Get content type data base on the given column and it's corresponding value.
 *
 * @param {string} column               The table/collection field name. Allowed column names are ID, slug, and name.
 * @param {string|int} value            The value of the specified column use to match in the query.
 * @returns {Promise<*>}
 */
const getContentTypeBy = async (column, value) => {
    if ( ! column ) {
        return reject( il8n('Column name is required.') );
    }

    if ( ! value ) {
        return reject( _.sprintf( il8n('The value for column `%s` is required.'), column ) );
    }

    if ( 'ID' === column ) {
        let ID = parseInt(value);

        if ( _.isNaN(ID) ) {
            return reject( il8n('Invalid content type ID.') );
        }
    }

    let allowed = ['ID', 'slug'];
    if ( ! _.contains( allowed, column ) ) {
        return reject( il8n('Invalid column name.') );
    }

    let cache = Cache.get( 'contentType', column, value );
    if ( cache ) {
        /**
         * Fired to filter the content type data object before returning.
         *
         * @param {object} content
         */
        cache = await Filter.apply( 'getContentType', cache );

        return resolve(cache);
    }

    return contentTypeQuery().getTypeBy( column, value )
        .then( async content => {
            Cache.set( 'contentType', content.ID, content );
            Cache.set( 'contentType', content.slug, content );

            content = await Filter.apply( 'getContentType', content );

            return content;
        });
};
setGlobalVar( 'getContentTypeBy', getContentTypeBy );

/**
 * Get the content type data base on the given ID.
 *
 * @param {int} ID          Required. The content type id to get the data from.
 * @returns {Promise<*>}
 */
const getContentType = ID => {
    return getContentTypeBy( 'ID', ID );
};
setGlobalVar( 'getContentType', getContentType );

/**
 * Remove content type data from the database.
 *
 * @param {int} ID              Required. The content type id to remove the data from.
 * @returns {Promise<*>}
 */
const deleteContentType = async ID => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid content type ID.') );
    }

    let old = await getContentType(ID).catch(errorHandler);
    if ( ! old || old.error ) {
        return reject( il8n('Invalid content ID.') );
    }

    return contentTypeQuery().delete(ID)
        .then( async ok => {
            Cache.clear( 'contentType', ID );
            Cache.clear( 'contentType', old.slug );
            Cache.clearGroup( 'contentTypes' );

            /**
             * Trigger whenever a content type is remove from the database.
             *
             * @param {int} ID              The id of the deleted content type.
             * @param {object} content      The data object comprising the content type.
             */
            await appEvent.trigger( 'deletedContentType', ID, old );

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
        key = false,
        contents = [];

    if ( keys && keys.length ) {
        key = keys.join('-');

        let cache = Cache.get( 'contentTypes', key );
        if ( cache ) {

            cache.map( async content => {
                content = await Filter.apply( 'getContentType', content );

                contents.push(content);
            });

            return resolve(content);
        }
    }

    return contentTypeQuery().getContentTypes(filter)
        .then( results => {

            results.map( async result => {
                Cache.set( 'contentType', result.ID, result );
                Cache.set( 'contentType', result.slug, result );

                result = await Filter.apply( 'getContentType', result );

                contents.push(result);
            });

            if ( key ) {
                Cache.set( 'contentTypes', key, results );
            }

            return contents;
        });
};
setGlobalVar( 'getContentTypes', getContentTypes );

const addContent = async contentArgs => {
    let {typeId} = contentArgs;

    typeId = parseInt(typeId);
    if ( ! typeId ) {
        return reject( il8n('Invalid content type.') );
    }

    let contentType = await getContentType(typeId).catch(returnFalse);
    if ( ! contentType ) {
        return reject( il8n('Invalid content type.') );
    }

    let {title, author} = contentArgs,
        fields = _.toObject(contentType.fields);

    if ( fields.title && ! title ) {
        return reject( il8n('No content title.') );
    }

    if ( fields.author && ! author ) {
        // @todo: Check current user
    }

    let {status, slug} = contentArgs;
    if ( contentType.public ) {
        if ( ! slug ) {
            contentArgs.slug = _.toSlug(title);
        }
    }

    if ( ! status ) {
        // Default status shall be 'draft'
        contentArgs.status = 'draft';
    }

    let columns = contentType.fields.concat(['status', 'template']),
        contentColumns = _.pick( contentArgs, columns );

    return contentTypeQuery().insertContent( typeId, contentColumns );
};
setGlobalVar( 'addContent', addContent );

const updateContent = async content => {
    let {typeId, ID} = content;

    typeId = parseInt(typeId);
    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(returnFalse);
    if ( ! contentType ) {
        return reject( il8n('Content type does not exist.') );
    }

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid content id.') );
    }

    let old = await getContent( typeId, ID ).catch(errorHandler);
    if ( ! old || old.error ) {
        return reject( il8n('Content does\'t exist.') );
    }

    let columns = contentType.fields.concat(['status', 'template', 'ID']),
        contentColumns = _.pick( content, columns );

    if ( content.slug && old.slug === content.slug ) {
        // Remove slug so it wouldn't re-filtered
        delete contentColumns.slug;
    }

    return contentTypeQuery().updateContent( typeId, contentColumns )
        .then( () => {

            return ID;
        });
};
setGlobalVar( 'updateContent', updateContent );

const getContentBy = (typeId, column, value) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid type id.') );
    }

    if ( ! column ) {
        return reject( il8n('Column name is required.') );
    }

    if ( ! value ) {
        return reject( _.sprintf( il8n('The value for column `%s` is required.'), column ) );
    }

    if ( 'ID' === column ) {
        let ID = parseInt(value);

        if ( _.isNaN(ID) ) {
            return reject( il8n('Invalid content type ID.') );
        }
    }

    let allowed = ['ID', 'slug'];
    if ( ! _.contains( allowed, column ) ) {
        return reject( il8n('Invalid column name.') );
    }

    return contentTypeQuery().getContentBy( typeId, column, value )
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            let content = results.shift();

            // Apply filters here

            return content;
        });
};
setGlobalVar( 'getContentBy', getContentBy );

const getContent = (typeId, ID) => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid content ID.') );
    }

    return getContentBy( typeId, 'ID', ID );
};
setGlobalVar( 'getContent', getContent );

const getContents = query => {
    return contentTypeQuery().getContents(query);
};
setGlobalVar( 'getContents', getContents );