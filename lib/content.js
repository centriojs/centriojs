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

    options = _.stripNull(options);

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

    if ( options.slug && old.slug === options.slug ) {
        delete options.slug;
    }

    return contentTypeQuery().update(options)
        .then( async () => {
            Cache.clear( 'contentType', ID );
            Cache.clear( 'contentType', old.slug );
            Cache.clearGroup( 'contentTypes' );

            old = _.extend( old, options );

            /**
             * Trigger whenever a content type is updated.
             *
             * @param {int} ID
             */
            await appEvent.trigger( 'updatedContentType', ID, old );

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
const getContentTypes = async filter => {
    filter = filter || {};

    let keys = _.values(filter),
        key = false,
        contents = [];

    if ( keys && keys.length ) {
        key = keys.join('-');

        let cache = Cache.get( 'contentTypes', key );
        if ( cache ) {
            for ( let i = 0; i < cache.length; i++ ) {
                let content = cache[i];

                content = await Filter.apply( 'getContentType', content );
                contents.push(content);
            }

            return resolve(contents);
        }
    }

    return contentTypeQuery().getContentTypes(filter)
        .then( async results => {
            for ( let i = 0; i < results.length; i++ ) {
                let result = results[i];

                Cache.set( 'contentType', result.ID, result );
                Cache.set( 'contentType', result.slug, result );

                result = await Filter.apply( 'getContentType', result );

                contents.push(result);
            }

            if ( key ) {
                Cache.set( 'contentTypes', key, results );
            }

            return contents;
        });
};
setGlobalVar( 'getContentTypes', getContentTypes );

/**
 * Insert new content to the database.
 *
 * @param contentArgs   {
 *     @param {int} typeId                  The content type id where the content belong to.
 *     @param {string} title                The content title if title field is enabled.
 *     @param {string} summary              A brief summary of the content if summary field enabled.
 *     @param {string} slug                 A unique slug use to construct the content's permalink structure.
 *                                          Content type must be public to enable this field.
 *     @param {string} status               Statuses are `public`, `private`, `pending`, or `draft`. Default is draft.
 *     @param {string} contentArgs          The full content description.
 *     @param {int} author                  The use id created the content. Default is current user's id.
 * }
 * @returns {Promise<*>}
 */
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

    let columns = contentType.fields.concat(['status', 'template']);

    let contentColumns = _.pick( contentArgs, columns );

    return contentTypeQuery().insertContent( typeId, contentColumns );
};
setGlobalVar( 'addContent', addContent );

/**
 * Update a content in the database base on the given content id.
 *
 * @param {object} content {
 *     @param {int} ID                      Required. The id of the content to update to.
 *     @param {int} typeId                  Optional. The content type id where the content belong to.
 *     @param {string} title                Optional. The content title if title field is enabled.
 *     @param {string} summary              Optional. A brief summary of the content if summary field enabled.
 *     @param {string} slug                 Optional. A unique slug use to construct the content's permalink structure.
 *                                          Content type must be public to enable this field.
 *     @param {string} status               Optional. Statuses are `public`, `private`, `pending`, or `draft`. Default is draft.
 *     @param {string} contentArgs          Optional. The full content description.
 *     @param {int} author                  Optional. The id of the user created. Default is current user's id.
 * }
 * @returns {Promise<*>}
 */
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

/**
 * Delete content from the database.
 *
 * @param {int} typeId
 * @param {int} ID
 * @returns {Promise<*>}
 */
const deleteContent = async (typeId, ID) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid type id.') );
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

    return contentTypeQuery().deleteContent( typeId, ID )
        .then( done => {
            return done;
        });
};
setGlobalVar( 'deleteContent', deleteContent );

/**
 * Get content base on the given field column name.
 *
 * @param {int} typeId
 * @param {string} column               The name of the column field that the value corresponds at. Allowed columns are ID, slug.
 * @param {string|int} value
 * @returns {Promise<*>}
 */
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
        .then( content => {

            // Apply filters here

            return content;
        });
};
setGlobalVar( 'getContentBy', getContentBy );

/**
 * Get content base on the given id.
 *
 * @param {int} typeId
 * @param {int} ID
 * @returns {Promise<*>}
 */
const getContent = (typeId, ID) => {
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid content ID.') );
    }

    return getContentBy( typeId, 'ID', ID );
};
setGlobalVar( 'getContent', getContent );

const getContents = query => {
    query = query || {};

    return contentTypeQuery().getContents(query);
};
setGlobalVar( 'getContents', getContents );

const getContentProperty = async (typeId, contentId, name) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    contentId = parseInt(contentId);
    if ( _.isNaN(contentId) ) {
        return reject( il8n('Invalid content id.') );
    }

    return contentTypeQuery().getContentProperty( typeId, contentId, name )
        .then( value => {
            value = unserialize(value);

            // Save cache here

            return value;
        });
};
setGlobalVar( 'getContentProperty', getContentProperty );

const getContentProperties = async (typeId, contentId) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    contentId = parseInt(contentId);
    if ( _.isNaN(contentId) ) {
        return reject( il8n('Invalid content id.') );
    }

    return contentTypeQuery().getContentProperties( typeId, contentId )
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            let properties = {};

            results.map( result => {
                properties[result.name] = unserialize(result.value);
            });

            // @todo: Cache here

            return properties;
        });
};
setGlobalVar( 'getContentProperties', getContentProperties );

const setContentProperty = async (typeId, contentId, name, value) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    contentId = parseInt(contentId);
    if ( _.isNaN(contentId) ) {
        return reject( il8n('Invalid content id.') );
    }

    value = serialize(value);

    let oldValue = await getContentProperty( typeId, contentId, name ).catch(returnFalse);

    if ( oldValue ) {
        return contentTypeQuery().updateContentProperty( typeId, contentId, name, value );
    }

    return contentTypeQuery().setContentProperty( typeId, contentId, name, value );
};
setGlobalVar( 'setContentProperty', setContentProperty );

const deleteContentProperty = async (typeId, contentId, name) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    contentId = parseInt(contentId);
    if ( _.isNaN(contentId) ) {
        return reject( il8n('Invalid content id.') );
    }

    let old = await getContentProperty( typeId, contentId, name ).catch(errorHandler);
    if ( old && old.error ) {
        return reject( il8n('Invalid content property.') );
    }

    return contentTypeQuery().deleteContentProperty( typeId, contentId, name );
};
setGlobalVar( 'deleteContentProperty', deleteContentProperty );

const setContentCategory = (typeId, contentId, value) => {
    return setContentProperty( typeId, contentId, 'category', value );
};
setGlobalVar( 'setContentCategory', setContentCategory );

const deleteContentCategory = (typeId, contentId) => {
    return deleteContentProperty( typeId, contentId, 'category' );
};
setGlobalVar( 'deleteContentCategory', deleteContentCategory );

const getContentCategory = (typeId, contentId) => {
    return getContentProperty( typeId, contentId, 'category' );
};
setGlobalVar( 'getContentCategory', getContentCategory );