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
 *     @param {bool} showUI
 *     @param {string} status           The status [active|inactive] to which the content type will be inserted like. Defaults `active`.
 *     @param {boolean} hasComments     Whether content of this type can have comments.
 *     @param {boolean} hasArchive      Whether contents of this type will be archive for public viewing.
 *     @parma {boolean} hasPage
 *     @param {int} archiveTemplate     The preset ID created for this contents archive visualization.
 *     @param {string} slug             A unique slug use to prefix the content/s permalink structure.
 *     @param {array} fields            An array of fields use to create the contents of this type. Default fields
 *                                      options are title, slug (public must be true), summary, content, and author.
 * }
 * @returns {Promise<*>}
 */
const addContentType = options => {
    let {name, slug, type} = options;

    if ( ! name ) {
        return reject( il8n('No content type name.') );
    }

    if ( ! slug ) {
        options.slug = _.toSlug(name);
    }

    if ( ! options.status ) {
        options.status = 'active';
    }

    let {fields} = options;
    if ( ! fields ) {
        if ( ! type ) {
            fields = ['title', 'description', 'content', 'author', 'slug'];
        } else {
            fields = ['name', 'description', 'slug'];
        }
    }

    options.fields = fields;
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
 *     @param {string} status           Optional. The status [active|inactive] to which the content type will be inserted like.
 *     @param {boolean} hasArchive      Optional. Whether contents of this type will be archive for public viewing.
 *     @param {int} archiveTemplate     Optional. The preset ID created for this contents archive visualization.
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

            options = _.extend( old, options );

            /**
             * Trigger whenever a content type is updated.
             *
             * @param {int} ID              The id of content type that is updated.
             * @param {object} options      The new content type options.
             * @param {object} old          The previously set content type options.
             */
            await appEvent.trigger( 'updatedContentType', ID, options, old );

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

    let cache = Cache.get( 'contentType', value );
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

const getArchivePermalink = async typeId => {
    let contentType = await getContentType(typeId).catch(errorHandler);

    if ( ! contentType || contentType.error || ! contentType.public || ! contentType.hasArchive ) {
        return false;
    }

    return '/' + contentType.slug;
};
setGlobalVar( 'getArchivePermalink', getArchivePermalink );

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
 *     @param {string} search               Optional. An string use to match on content type title.
 * }
 * @returns {Promise<*>}
 */
const getContentTypes = async filter => {
    filter = filter || {};

    let key = generateKey(filter),
        cache = Cache.get( 'contentTypes', key ),
        contents = [];

    if ( key && cache ) {
        for ( let i = 0; i < cache.length; i++ ) {
            let content = cache[i];

            content = await Filter.apply( 'getContentType', content );
            contents.push(content);
        }

        return resolve(contents);
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
        })
        .catch( err => {
            errorHandler(err);

            return [];
        });
};
setGlobalVar( 'getContentTypes', getContentTypes );

/**
 * Set or update content type property.
 *
 * @param (int) typeId
 * @param (string) name
 * @param (any) value
 * @param (bool) isSingle
 * @returns {Promise<*>}
 */
const setTypeProperty = function( typeId, name, value ) {
    let isSingle = arguments[3] || false;

    typeId = parseInt(typeId);
    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid type id.') );
    }

    if ( ! name ) {
        return reject( il8n('Missing property name.') );
    }

    value = serialize(value);

    return contentTypeQuery().setProperty( typeId, name, value, isSingle )
        .then( async () => {
            Cache.clear( 'typeProperties', typeId );
            Cache.clear( 'typeProperty', typeId, name );

            await appEvent.trigger( 'setTypeProperty', typeId, name, unserialize(value) );

            return true;
        });
};
setGlobalVar( 'setTypeProperty', setTypeProperty );

/**
 * Delete property of the given content type id.
 *
 * @param {int} typeId
 * @param {string} name
 * @param {any} value
 * @returns {Promise<*>}
 */
const deleteTypeProperty = async function(typeId, name) {
    let value = arguments[2] || undefined;

    typeId = parseInt(typeId);
    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid type id.') );
    }

    if ( value ) {
        value = serialize(value);
    }

    let oldValue = value;
    if ( ! value ) {
        oldValue = await getTypeProperty( typeId, name );
    }

    return contentTypeQuery().deleteProperty( typeId, name, value )
        .then( async () => {
            Cache.clearGroup( 'typeProperties' );

            if ( name ) {
                Cache.clear( 'typeProperty', name );
            } else {
                // If no name specified, clear all properties
                Cache.clearGroup( 'typeProperty' );
            }

            await appEvent.trigger( 'deletedTypeProperty', typeId, name, oldValue );

            return true;
        });
};
setGlobalVar( 'deleteTypeProperty', deleteTypeProperty );

/**
 * Get property value or values of the given content type id.
 *
 * @param {int} typeId
 * @param {string} name
 * @param {bool} isSingle
 * @returns {Promise<*>}
 */
const getTypeProperty = function( typeId, name ) {
    let isSingle = arguments[2] || false;

    typeId = parseInt(typeId);
    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid type id.') );
    }

    return contentTypeQuery().getProperty( typeId, name, isSingle )
        .then( results => {
            if ( ! results || ! results.length ) {
                return results;
            }

            if ( name ) {
                Cache.set( 'typeProperty', name, results );
            } else {
                Cache.set( 'typeProperties', typeId, results );
            }

            return results;
        });
};
setGlobalVar( 'getTypeProperty', getTypeProperty );

/**
 * Return properties base on query parameters.
 *
 * @param {object} query {
 *       @param {int} objectId                  The content type id where the properties were set at.
 *       @param {array} objectId__in            An array of content type id where the properties were set at.
 *       @param {string} name                   The name of the property to retrieve at.
 *       @param {array} name__in                An array of property names to get from the database.
 *       @param {any} value                     The property value to compare in the query. Application only if `name`
 *                                              or `name__in` parameter is present in the query.
 * }
 * @returns {Promise<*>}
 */
const getTypeProperties = query => {
    return contentTypeQuery().getProperties( query );
};
setGlobalVar( 'getTypeProperties', getTypeProperties );

/**
 * Insert new content to the database.
 *
 * @param contentArgs   {
 *     @param {int} typeId                      The content type id where the content belong to.
 *     @param {string} title                    The content title if title field is enabled.
 *     @param {string} description              A brief summary of the content if summary field enabled.
 *     @param {string} slug                     A unique slug use to construct the content's permalink structure.
 *                                              Content type must be public to enable this field.
 *     @param {string} status                   Statuses are `public`, `private`, `pending`, or `draft`. Default is draft.
 *     @param {string} content                  The full content description.
 *     @param {int} author                      The use id created the content. Default is current user's id.
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

    if ( fields.author ) {
        if ( ! author && ! isUserLoggedIn() ) {
            return reject( il8n('Author name is required.') );
        }

        if ( ! author && isUserLoggedIn() ) {
            contentArgs.author = currentUser.ID;
        }
    }

    let {status, slug} = contentArgs;
    if ( ! slug ) {
        contentArgs.slug = _.toSlug(title);
    }

    if ( ! status ) {
        // Default status shall be 'draft'
        contentArgs.status = 'draft';
    }

    let columns = contentType.fields.concat(['status', 'template']);
    let contentColumns = _.pick( contentArgs, columns );

    return contentTypeQuery().insertContent( typeId, contentColumns )
        .then( async id => {
            Cache.clearGroup( 'contents' + typeId );

            await appEvent.trigger( 'insertedContent', id, typeId );

            return id;
        });
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
        .then( async () => {
            Cache.clearGroup( 'contents' + typeId );
            Cache.clear( 'contentID' + typeId, ID );
            Cache.clear( 'contentSlug' + typeId, old.slug );

            await appEvent.trigger( 'updatedContent', ID, typeId, old );

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
        .then( async done => {
            Cache.clearGroup( 'contents' + typeId );
            Cache.clear( 'contentId' + typeId, ID );
            Cache.clear( 'contentSlug' + typeId, old.slug );

            await appEvent.trigger( 'deletedContent', old, typeId );

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
const getContentBy = async (typeId, column, value) => {
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

    let key = 'ID' === column ? 'contentId' : 'contentSlug',
        cache = Cache.get( key, value );

    if ( cache ) {
        cache = await Filter.apply( 'getContent', cache, typeId );

        return resolve(cache);
    }

    return contentTypeQuery().getContentBy( typeId, column, value )
        .then( async results => {
            if ( ! results.length ) {
                return false;
            }

            let content = results.shift();

            Cache.set( 'contentId' + typeId, content.ID );
            Cache.set( 'contentSlug' + typeId, content.slug );

            content = await Filter.apply( 'getContent', content, typeId );

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

const findContentParent = async (slugs, typeId, contentId) => {
    let content = await getContent( typeId, contentId ).catch(errorHandler);
    if ( ! content || content.error ) {
        return slugs;
    }

    if ( content.parent && content.parent > 0 ) {
        slugs = await findContentParent( slugs, typeId, content.parent );
    }

    slugs.push(content.slug);

    return slugs;
};

const getContentPermalink = async (typeId, contentId) => {
    let contentType = await getContentType(typeId).catch(errorHandler);

    if ( ! contentType || contentType.error || ! contentType.public || ! contentType.hasPage ) {
        return false;
    }

    let slugs = await findContentParent([contentType.slug], contentId, typeId );

    return '/' + slugs.join('/');
};
setGlobalVar( 'getContentPermalink', getContentPermalink );

/**
 * Get contents list base on the specified filter query.
 *
 * @param {object} query {
 *     @param {string} status
 *     @param {array} status__in
 *     @param {array} status__not_in
 *     @param {int} author
 *     @param {array} author__in
 *     @param {int} page
 *     @param {int} perPage
 *     @param {int} category
 *     @param {array} category__in
 *     @param {int} tag
 *     @param {array} tag__in
 *     @param {object} property {
 *         @param {string} name
 *         @param {string|int|array} value
 *         @param {string} compare
 *     }
 *     @param {array} properties {
 *         Each array contains `relation` and an array `property` filters where
 *         {
 *             @param {string} relation
 *             @param {array} property {
 *                 @param {string} name
 *                 @param {string|int|array} value
 *                 @param {string} compare
 *             }
 *         }
 *     }
 * }
 * @returns {*}
 */
const getContents = async query => {
    query = query || {};

    let {typeId} = query;

    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    query = await Filter.apply( 'preGetContents', query );

    let key = generateKey(query),
        cache = Cache.get( 'getContents', key ),
        contents = [];

    if ( key && cache && cache.length ) {
        for ( let i = 0; i < cache.length; i++ ) {
            let content = cache[i];

            content = await Filter.apply( 'getContent', content, typeId );

            contents.push(content);
        }

        return resolve(contents);
    }

    return contentTypeQuery().getContents(query)
        .then( async results => {
            if ( ! results.length ) {
                return false;
            }

            for ( let i = 0; i < results.length; i++ ) {
                let content = results[i];

                Cache.set( 'contentId' + typeId, content.ID, content );
                Cache.set( 'contentSlug' + typeId, content.slug, content );

                content = await Filter.apply( 'getContent', content, typeId );

                contents.push(content);
            }

            if ( key ) {
                Cache.set( 'contents' + typeId, key, results );
            }

            return contents;
        })
        .catch( err => {
            errorHandler(err);

            return [];
        });
};
setGlobalVar( 'getContents', getContents );

/**
 * Search contents from the entire active content type that is type of content.
 *
 * @param {string} term
 * @param {int} page
 * @param {int} perPage
 * @returns {Promise<*>}
 */
const searchContents = (term, page, perPage) => {
    let key = generateKey({
        term: term,
        page: page,
        perPage: perPage
    });

    let cache = Cache.get( 'searchContents', key );

    if ( cache ) {
        return resolve(cache);
    }

    return contentTypeQuery().searchContents( term, page, perPage )
        .then( results => {
            if ( ! results.length ) {
                return [];
            }

            Cache.set( 'searchContents', key, results );

            return results;
        })
        .catch( err => {
            errorHandler(err);

            return [];
        });
};
setGlobalVar( 'searchContents', searchContents );

/**
 * Get property value or an array of properties base on the given content type id and content id.
 *
 * @param {int} typeId
 * @param {int} contentId
 * @param {string} name
 * @returns {Promise<*>}
 */
const getContentProperty = async function (typeId, contentId, name) {
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

    let isSingle = arguments[3] || false,
        cache = Cache.get( 'contentProperty' + typeId, contentId );

    if ( cache && cache[name] ) {
        let property = cache[name];

        if ( isSingle ) {
            return resolve(property[0]);
        }

        return resolve(property);
    }

    cache = cache || {};

    return contentTypeQuery().getContentProperty( typeId, contentId, name, isSingle )
        .then( results => {
            if ( ! results || ! results.length ) {
                return results;
            }

            if ( name ) {
                cache[name] = results;
            } else {
                cache = results;
            }

            Cache.set( 'contentProperty' + typeId, contentId, cache );

            return results;
        });
};
setGlobalVar( 'getContentProperty', getContentProperty );

const getContentProperties = async (typeId, query) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    return contentTypeQuery().getContentProperties( typeId, query );
};
setGlobalVar( 'getContentProperties', getContentProperties );

/**
 * Set or update content's property.
 *
 * @param {object} props {
 *     @param {int} typeId
 *     @param {int} contentId
 *     @param {string} name
 *     @param {string|int|array|object} value
 * }
 * @returns {Promise<*>}
 */
const setContentProperty = async function (props) {
    let {typeId, contentId, value} = props;
    let isSingle = arguments[1] || false;

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

    props.value = serialize(value);

    return contentTypeQuery().setContentProperty( props, isSingle )
        .then( () => {
            Cache.clearGroup( 'contentProperty' + typeId, contentId );

            return true;
        });
};
setGlobalVar( 'setContentProperty', setContentProperty );

/**
 * Delete content property from the database.
 *
 * @param {int} typeId                              Required. The id of the content type where the content belongs to.
 * @param {int} contentId                           Required. The id of the content where the property belongs to.
 * @param {string} name                             Optional. If present, will remove all property of the given name.
 * @param {string|int|array} value                  Optional. If preset, will remove property that match the given value.
 * @returns {Promise<*>}
 */
const deleteContentProperty = async function (typeId, contentId) {
    let name = arguments[2] || false,
        value = arguments[3] || undefined;

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

    return contentTypeQuery().deleteContentProperty( typeId, contentId, name, value )
        .then( () => {
            Cache.clear( 'contentProperty' + typeId, contentId );

            return true;
        });
};
setGlobalVar( 'deleteContentProperty', deleteContentProperty );

/**
 * Insert term data base on the given tax type id.
 *
 * @param {object} term {
 *     @param {int} typeId
 *     @param {string} name
 *     @param {string} description
 *     @param {int} thumbId
 *     @param {int} parent
 * }
 * @returns {Promise<*>}
 */
const insertTerm = async term => {
    let {typeId, name} = term;

    if ( ! typeId ) {
        return reject( il8n('Missing term type id.') );
    }

    if ( ! name ) {
        return reject( il8n('Missing term name.') );
    }

    let contentType = await getContentType( typeId ).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid term type id.') );
    }

    let {slug} = term;
    if ( ! slug ) {
        term.slug = _.toSlug(name);
    }

    delete term.typeId;

    return contentTypeQuery().insertTerm( typeId, term )
        .then( async id => {
            Cache.clearGroup( 'terms' + typeId );

            await appEvent.trigger( 'insertedTerm', id, typeId );

            return id;
        });
};
setGlobalVar( 'insertTerm', insertTerm );

/**
 * Update term data from the database.
 *
 * @param {object} term {
 *     @param {int} typeId
 *     @param {string} name
 *     @param {string} description
 *     @param {int} thumbId
 *     @param {int} parent
 * }
 * @returns {Promise<*>}
 */
const updateTerm = async term => {
    let {typeId, name, ID} = term;

    if ( ! typeId ) {
        return reject( il8n('Missing term type id.') );
    }

    if ( ! name ) {
        return reject( il8n('Missing term name.') );
    }

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid term id.') );
    }

    let contentType = await getContentType( typeId ).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid term type id.') );
    }

    let {slug} = term;
    if ( ! slug ) {
        term.slug = _.toSlug(name);
    }

    delete term.typeId;

    let old = await getTerm( typeId, ID ).catch(errorHandler);
    if ( ! old || old.error ) {
        return reject( il8n('Invalid term type id.') );
    }

    return contentTypeQuery().updateTerm( typeId, term )
        .then( async () => {
            Cache.clearGroup( 'terms' + typeId );
            Cache.clear( 'termId' + typeId, ID );
            Cache.clear( 'termSlug' + typeId, old.slug );

            await appEvent.trigger( 'updatedTerm', ID, typeId, old );

            return ID;
        });
};
setGlobalVar( 'updateTerm', updateTerm );

/**
 * Delete term from the database.
 *
 * @param {int} typeId
 * @param {int} ID
 * @returns {Promise<*>}
 */
const deleteTerm = async (typeId, ID) => {
    if ( ! typeId ) {
        return reject( il8n('Missing term type id.') );
    }

    let contentType = await getContentType( typeId ).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid term type id.') );
    }

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid term id.') );
    }

    let old = await getTerm( typeId, ID ).catch(errorHandler);
    if ( ! old || old.error ) {
        return reject( il8n('Invalid term type id.') );
    }

    return contentTypeQuery().deleteTerm( typeId, ID )
        .then( async () => {
            Cache.clear( 'termId' + typeId, ID );
            Cache.clear( 'termSlug' + typeId, old.slug );
            Cache.clearGroup( 'terms' + typeId );

            await appEvent.trigger( 'deletedTerm', ID, old, typeId );

            return true;
        });
};
setGlobalVar( 'deleteTerm', deleteTerm );

const getTermBy = async (typeId, column, value) => {
    typeId = parseInt(typeId);

    if ( ! typeId ) {
        return reject( il8n('Missing term type id.') );
    }

    if ( ! column || ! value ) {
        return reject( _.sprintf( il8n('Missing %s or value of %s'), column ) );
    }

    let contentType = await getContentType( typeId ).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid term type id.') );
    }

    let key = 'termSlug' + typeId;
    if ( 'ID' === column ) {
        value = parseInt(value);
        if ( _.isNaN(value) ) {
            return reject( il8n('Invalid term id.') );
        }

        key = 'termId' + typeId;
    }

    let cache = Cache.get( key, value );
    if ( cache ) {
        return await Filter.apply( 'getTerm', cache, typeId );
    }

    return contentTypeQuery().getTermBy( typeId, column, value )
        .then( async results => {
            if ( ! results || ! results.length ) {
                return false;
            }

            let term = results.shift();

            Cache.set( 'termId' + typeId, term.ID, term );
            Cache.set( 'termSlug' + typeId, term.slug, term );

            term = await Filter.apply( 'getTerm', term, typeId );

            return term;
        });
};
setGlobalVar( 'getTermBy', getTermBy );

const getTerm = async (typeId, ID) => {
    return getTermBy( typeId, 'ID', ID );
};
setGlobalVar( 'getTerm', getTerm );

/**
 * Get the list of terms base on the given query.
 *
 * @param {object} query {
 *     @param {int} typeId                  The tax type id.
 *     @param {array} include               An array of term IDs to include in the query result.
 *     @param {array} exclude               An array of term IDs to exclude in the query result.
 *     @param {int} contentTypeId           An id of a content type of type content where the terms are set or use.
 *     @param {int} page                    The page number of the current query.
 *     @param {int} perPage                 The number terms list to return.
 * }
 * @returns {Promise<*>}
 */
const getTerms = async query => {
    let {typeId} = query;

    typeId = parseInt(typeId);

    if ( ! typeId ) {
        return reject( il8n('Missing term type id.') );
    }

    let contentType = await getContentType( typeId ).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid term type id.') );
    }

    let key = generateKey(query),
        cache = Cache.get( 'terms' + typeId, key );

    if ( cache ) {
        let _terms = [];

        for ( let i = 0; i < cache.length; i++ ) {
            let term = await Filter.apply( 'getTerm', cache[i], typeId );

            _terms.push(term);
        }

        return resolve(_terms);
    }

    return contentTypeQuery().getTerms(query)
        .then( async terms => {
            if ( ! terms.length ) {
                return terms;
            }

            let _terms = [];

            for ( let i = 0; i < terms.length; i++ ) {
                let term = await Filter.apply( 'getTerm', terms[i], typeId );

                _terms.push(term);
            }

            if ( key ) {
                Cache.set( 'terms' + typeId, key, _terms );
            }

            return _terms;
        });
};
setGlobalVar( 'getTerms', getTerms );

const setContentTerm = async (contentTypeId, termTypeId, contentId, termIds) => {
    termIds = ! _.isArray( termIds ) ? [termIds] : termIds;

    let oldTerms = await getContentTerms( contentTypeId, termTypeId, contentId ).catch(errorHandler);
    if ( oldTerms.length ) {
        let oldTermIds = _.pluck( oldTerms, 'ID' );
        oldTermIds = _.without( oldTermIds, termIds );

        if ( oldTermIds.length ) {
            //await deleteContentTerm( contentTypeId, termTypeId, contentId, oldTermIds );
        }
    }

    for ( let i = 0; i < termIds.length; i++ ) {
        await setContentProperty({
            typeId: contentTypeId,
            contentId: contentId,
            name: termTypeId,
            value: termIds[i]
        }).catch(errorHandler);

        await setContentProperty({
            typeId: termTypeId,
            contentId: termIds[i],
            name: contentTypeId,
            value: contentId
        }).catch(errorHandler);
    }

    await appEvent.trigger( 'setContentTerm', contentTypeId, termTypeId, contentId, termIds );

    return true;

};
setGlobalVar( 'setContentTerm', setContentTerm );

const deleteContentTerm = async (contentTypeId, termTypeId, contentId, termIds) => {
    termIds = ! _.isArray( termIds ) ? [termIds] : termIds;

    if ( ! termIds.length ) {
        let terms = await getContentProperties( termTypeId, {name: contentTypeId} ).catch(errorHandler);

        if ( ! terms || terms.error || ! terms.length ) {
            return true;
        }

        termIds = _.pluck( terms, 'objectId' );
    }

    for ( let i = 0; i < termIds.length; i++ ) {
        let termId = termIds[i];

        await deleteContentProperty( contentTypeId, contentId, termTypeId, termId );
        await deleteContentProperty( termTypeId, termId, contentTypeId, contentId );
    }

    appEvent.trigger( 'deletedContentTerm', contentTypeId, termTypeId, contentId, termIds );

    return true;
};
setGlobalVar( 'deleteContentTerm', deleteContentTerm );

const getContentTerms = async (contentTypeId, termTypeId, contentId) => {
    return getTerms({
        typeId: termTypeId,
        property: {
            name: contentTypeId,
            value: contentId
        }
    });
};
setGlobalVar( 'getContentTerms', getContentTerms );

/**
 * Add new comment.
 *
 * @param {int} typeId
 * @param {object} comment {
 *     @param {int} contentId
 *     @param {int} authorId
 *     @param {string} author
 *     @param {string} authorEmail
 *     @param {string} authorUrl
 *     @param {string} status
 *     @param {string} comment
 * }
 * @returns {Promise<*>}
 */
const addComment = async (typeId, comment) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject(il8n('Invalid content type id.'));
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject(il8n('Invalid content type.'));
    }

    let {contentId} = comment;
    contentId = parseInt(contentId);

    if ( _.isNaN(contentId) ) {
        return reject( il8n('Invalid content ID.') );
    }

    let {authorId, author, authorEmail} = comment;
    if ( ! authorId ) {
        if ( isUserLoggedIn() ) {
            comment.authorId = currentUser.ID;
        } else if ( ! author ) {
            return reject( il8n('Comment author is required.') );
        } else if ( ! authorEmail || ! _.isEmail(authorEmail) ) {
            return reject( il8n('Invalid author email.') );
        }
    }

    return contentTypeQuery().addComment( typeId, comment )
        .then( id => {
            Cache.clearGroup( 'contentComments' + typeId );

            return id;
        });
};
setGlobalVar( 'addComment', addComment );

/**
 * Update comment to the database.
 *
 * @param {int} typeId
 * @param {object} comment {
 *     @param {int} ID                  Required. The id of the comment to update to.
 *     @param {int} contentId           Required. The id of the content where the comment posted.
 * }
 * @returns {Promise<*>}
 */
const updateComment = async (typeId, comment) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject(il8n('Invalid content type id.'));
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    let {contentId} = comment;
    contentId = parseInt(contentId);

    if ( _.isNaN(contentId) ) {
        return reject( il8n('Invalid content ID.') );
    }

    let {ID} = comment;
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject( il8n('Invalid comment ID.') );
    }

    return contentTypeQuery().updateComment( typeId, comment )
        .then( () => {
            Cache.clearGroup( 'contentComments' + typeId );
            Cache.clear( 'contentComment' + typeId, ID );

            return ID;
        });
};
setGlobalVar( 'updateComment', updateComment );

const deleteComment = async (typeId, commentId) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject(il8n('Invalid content type id.'));
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    commentId = parseInt(commentId);
    if ( _.isNaN(commentId) ) {
        return reject( il8n('Invalid comment ID.') );
    }

    return contentTypeQuery().deleteComment( typeId, commentId )
        .then( () => {
            Cache.clearGroup( 'contentComments' + typeId );
            Cache.clear( 'contentComment' + typeId, commentId );

            return true;
        });
};
setGlobalVar( 'deleteComment', deleteComment );

const getComment = async (typeId, commentId) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject(il8n('Invalid content type id.'));
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    commentId = parseInt(commentId);
    if ( _.isNaN(commentId) ) {
        return reject( il8n('Invalid comment ID.') );
    }

    let cache = Cache.get( 'contentComment' + typeId, commentId );
    if ( cache ) {
        return resolve(cache);
    }

    return contentTypeQuery().getComment( typeId, commentId )
        .then( comments => {
            if ( ! comments.length ) {
                return false;
            }

            let comment = comments.shift();

            Cache.set( 'contentComment' + typeId, commentId, comment );

            return comment;
        });
};
setGlobalVar( 'getComment', getComment );

/**
 * Get comments list from the database.
 *
 * @param {object} query {
 *     @param {int} contentId                   Optional. The content id where the comment posted at.
 *     @param {array} include                   An array of comment ID to include in the query.
 *     @param {array} exclude                   An array of comment IDs to exclude in the query result.
 *     @param {int} authorId                    The comment author id.
 *     @param {string} author                   The name of the comment author whom posted the comment.
 *     @param {int} page                        The page number to retrieve the list.
 *     @param {int} perPage                     The number of items to return in the query.
 *     @param {string} order                    The order to which the comment list sorted at. Default is `ASC`
 *     @param {string} orderby                  The column type to use to sort the order listing at. Default is `created`.
 * }
 * @returns {Promise<*>}
 */
const getComments = async query => {
    let {typeId} = query;

    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject(il8n('Invalid content type id.'));
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    let key = generateKey(query),
        cache = Cache.get( 'contentComments' + typeId, key );

    if ( key && cache ) {
        return resolve(cache);
    }

    return contentTypeQuery()
        .getComments( typeId, query )
        .then( results => {
            if ( ! results.length ) {
                return [];
            }

            results.map( result => {
                Cache.set( 'contentComment' + typeId, result.ID, result );
            });

            if ( key ) {
                Cache.set( 'contentComments' + typeId, key, results );
            }

            return results;
        })
        .catch( err => {
            errorHandler(err);

            return [];
        });
};
setGlobalVar( 'getComments', getComments );