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
 *     @param {object} settings {
 *         @param {int} itemPerPage
 *         @param {string} archiveTitle
 *         @param {string} archiveDescription
 *         @param {boolean} prefixByCategory
 *     }
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
 *     @param {object} settings {
 *         @param {int} itemPerPage
 *         @param {string} archiveTitle
 *         @param {string} archiveDescription
 *     }
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
        .then( () => {
            Cache.clearGroup( 'contents' + typeId );
            Cache.clear( 'contentID' + typeId, ID );
            Cache.clear( 'contentSlug' + typeId, old.slug );

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

            await appEvent.trigger( 'deletedContent', typeId, ID, old );

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
        .then( async content => {
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

    let isSingle = arguments[4] || false,
        cache = Cache.get( 'contentProperty' + typeId, contentId );

    if ( cache && cache[name] ) {
        let property = cache[name];

        if ( isSingle ) {
            return resolve(property[0]);
        }

        return resolve(property);
    }

    cache = cache || {};

    return contentTypeQuery().getContentProperty( typeId, contentId, name )
        .then( results => {
            if ( ! results.length ) {
                return reject(undefined);
            }

            let values = [];

            results.map( result => {
                values.push(unserialize(result.value));
            });

            cache[name] = values;

            Cache.set( 'contentProperty' + typeId, contentId, cache );

            if ( isSingle ) {
                return values[0];
            }

            return values;
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

    let cache = Cache.get( 'contentProperty' + typeId, contentId );
    if ( cache ) {
        return resolve(cache);
    }

    return contentTypeQuery().getContentProperties( typeId, contentId )
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            let properties = {};

            results.map( result => {
                let value = unserialize(result.value);

                if ( ! properties[result.name] ) {
                    properties[result.name] = value;
                } else {
                    let values = properties[result.name];

                    if ( _.isArray(values) ) {
                        values.push(value);
                    } else {
                        values = [values, value];
                    }

                    properties[result.name] = values;
                }
            });

            Cache.set( 'contentProperty' + typeId, contentId, properties );

            return properties;
        });
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
            Cache.clear( 'contentProperty' + typeId, contentId );

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
const deleteContentProperty = async function (typeId, contentId, name) {
    let value = arguments[3] || undefined;

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
 * Get category from the database base on the given column and value.
 *
 * @param {int} typeId
 * @param {string} column
 * @param {string|int|array} value
 * @returns {Promise<*>}
 */
const getCategoryBy = async (typeId, column, value) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    if ( ! column ) {
        return reject(il8n('Column name is required.'));
    }

    if ( ! value ) {
        return reject( _.sprintf(il8n('The value of %s is required.')) );
    }

    let key = 'ID' === column ? 'contentCategoryId' : 'contentCategorySlug',
        cache = Cache.get( key + typeId, value );

    if ( cache ) {
        return resolve(cache);
    }

    return contentTypeQuery().getCategoryBy( typeId, column, value )
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            let result = results.shift();

            Cache.set( 'contentCategoryId' + typeId, result.ID, result );
            Cache.set( 'contentCategorySlug' + typeId, result.slug, result );

            return result;
        });
};

/**
 * Get category base on the given ID.
 *
 * @param {int} typeId
 * @param {int} ID
 * @returns {Promise<*>}
 */
const getCategory = async (typeId, ID) => {
    return getCategoryBy( typeId, 'ID', ID );
};
setGlobalVar( 'getCategory', getCategory );

/**
 * Get category base from the given slug.
 *
 * @param {int} typeId
 * @param {string} slug
 * @returns {Promise<*>}
 */
const getCategoryBySlug = async (typeId, slug) => {
    return getCategoryBy( typeId, 'slug', slug );
};
setGlobalVar( 'getCategoryBySlug', getCategoryBySlug );

/**
 * Get category list from the database.
 *
 * @param {int} typeId
 * @param {object} query {
 *      @param {string} search
 *      @param {int} parent
 *      @param {array} parent__in
 *      @param {array} include                  The list of category IDs to include in the query results.
 *      @param {array} exclude                  The list of category IDs to exclude in the query results.
 * }
 * @returns {Promise<*>}
 */
const getCategories = async (typeId, query) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    query = query || {};

    let key = generateKey(query),
        cache = Cache.get( 'contentCategories' + typeId, key );

    if ( key && cache ) {
        return resolve(cache);
    }

    return contentTypeQuery().getCategories( typeId, query )
        .then( results => {
            if ( ! results.length ) {
                return [];
            }

            results.map( result => {
                Cache.set( 'contentCategoryId' + typeId, result.ID, result );
                Cache.set( 'contentCategorySlug' + typeId, result.slug, result );
            });

            if ( key ) {
                Cache.set( 'contentCategories' + typeId, key, results );
            }

            return results;
        })
        .catch( err => {
            errorHandler(err);

            return [];
        });
};
setGlobalVar( 'getCategories', getCategories );

/**
 * Add category to the database.
 *
 * @param {int} typeId
 * @param {object} category {
 *     @param {string} name
 *     @param {string} description
 *     @param {int} parent
 *     @param {string} slug
 * }
 * @returns {Promise<*>}
 */
const addCategory = async (typeId, category) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    let {name, slug} = category;
    if ( ! name ) {
        return reject( il8n('Category name is required.') );
    }

    if ( ! slug ) {
        category.slug = _.toSlug(name);
    }

    return contentTypeQuery().addCategory( typeId, category )
        .then( id => {
            Cache.clearGroup( 'contentCategories' + typeId );

            /**
             * Trigger whenever a new category is inserted to the database.
             *
             * @param {int} id
             * @param {int} typeId
             */
            appEvent.trigger( 'insertedCategory', id, typeId );

            return id;
        });
};
setGlobalVar( 'addCategory', addCategory );

/**
 * Update category to the database.
 *
 * @param {int} typeId
 * @param {object} category {
 *      @param {int} ID
 *      @param {string} name
 *      @param {string} description
 *      @param {int} parent
 *      @param {string} slug
 * }
 * @returns {Promise<*>}
 */
const updateCategory = async (typeId, category) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    let {ID} = category;
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject(il8n('Invalid category ID.') );
    }

    let old = await getCategory( typeId, ID ).catch(errorHandler);
    if ( old && old.error ) {
        return reject(old);
    }

    let {slug} = category;
    if ( slug && slug === old.slug ) {
        delete category.slug;
    }

    return contentTypeQuery().updateCategory( typeId, category )
        .then( () => {
            Cache.clearGroup( 'contentCategories' + typeId );
            Cache.clear( 'contentCategoryId' + typeId, ID );
            Cache.clear( 'contentCategorySlug' + typeId, old.slug );

            appEvent.trigger( 'updatedCategory', ID, typeId );

            return ID;
        });
};
setGlobalVar( 'updateCategory', updateCategory );

/**
 * Delete category from the database.
 *
 * @param {int} typeId
 * @param {int} ID
 * @returns {Promise<*>}
 */
const deleteCategory = async (typeId, ID) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject(il8n('Invalid content type id.'));
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject(il8n('Invalid category ID.'));
    }

    let old = await getCategory( typeId, ID ).catch(errorHandler);
    if ( ! old || old.error ) {
        return reject( il8n('Invalid category.') );
    }

    return contentTypeQuery().deleteCategory( typeId, ID )
        .then( () => {
            Cache.clearGroup( 'contentCategories' + typeId );
            Cache.clear( 'contentCategoryId' + typeId, ID );
            Cache.clear( 'contentCategorySlug' + typeId, old.slug );

            return true;
        });
};
setGlobalVar( 'deleteCategory', deleteCategory );

const getContentCategories = (typeId, contentId) => {
    return getContentProperty( typeId, contentId, 'category' );
};
setGlobalVar( 'getContentCategories', getContentCategories );

const setContentCategory = (typeId, contentId, categories) => {
    return setContentProperty({
        typeId: typeId,
        contentId: contentId,
        name: 'category',
        value: categories
    });
};
setGlobalVar( 'setContentCategory', setContentCategory );

const deleteContentCategory = (typeId, contentId) => {
    return deleteContentProperty( typeId, contentId, 'category' );
};
setGlobalVar( 'deleteContentCategory', deleteContentCategory );

/**
 * Get tag from the database base on the given column and value.
 *
 * @param {int} typeId
 * @param {string} column
 * @param {string|int|array} value
 * @returns {Promise<*>}
 */
const getTagBy = async (typeId, column, value) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    if ( ! column ) {
        return reject(il8n('Column name is required.'));
    }

    if ( ! value ) {
        return reject( _.sprintf(il8n('The value of %s is required.')) );
    }

    let key = 'ID' === column ? 'contentTagId' : 'contentTagSlug',
        cache = Cache.get( key + typeId, value );

    if ( cache ) {
        return resolve(cache);
    }

    return contentTypeQuery().getTagBy( typeId, column, value )
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            let result = results.shift();

            Cache.set( 'contentTagId' + typeId, result.ID, result );
            Cache.set( 'contentTagSlug' + typeId, result.slug, result );

            return result;
        });
};

/**
 * Get tag base on the given ID.
 *
 * @param {int} typeId
 * @param {int} ID
 * @returns {Promise<*>}
 */
const getTag = async (typeId, ID) => {
    return getTagBy( typeId, 'ID', ID );
};
setGlobalVar( 'getTag', getTag );

/**
 * Get category base from the given slug.
 *
 * @param {int} typeId
 * @param {string} slug
 * @returns {Promise<*>}
 */
const getTagBySlug = async (typeId, slug) => {
    return getTagBy( typeId, 'slug', slug );
};
setGlobalVar( 'getTagBySlug', getTagBySlug );

/**
 * Get tag list from the database.
 *
 * @param {int} typeId
 * @param {object} query {
 *      @param {string} search
 *      @param {int} parent
 *      @param {array} parent__in
 *      @param {array} include                  The list of category IDs to include in the query results.
 *      @param {array} exclude                  The list of category IDs to exclude in the query results.
 * }
 * @returns {Promise<*>}
 */
const getTags = async (typeId, query) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    query = query || {};

    let key = generateKey(query),
        cache = Cache.get( 'contentTags' + typeId, key );

    if ( cache ) {
        return resolve(cache);
    }

    return contentTypeQuery().getTags( typeId, query )
        .then( results => {
            if ( ! results.length ) {
                return false;
            }

            results.map( result => {
                Cache.set( 'contentTagId' + typeId, result.ID, result );
                Cache.set( 'contentTagSlug' + typeId, result.slug, result );
            });

            Cache.set( 'contentTags' + typeId, key, results );

            return results;
        });
};
setGlobalVar( 'getTags', getTags );

/**
 * Add tag to the database.
 *
 * @param {int} typeId
 * @param {object} category {
 *     @param {string} name
 *     @param {string} description
 *     @param {int} parent
 *     @param {string} slug
 * }
 * @returns {Promise<*>}
 */
const addTag = async (typeId, category) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    let {name, slug} = category;
    if ( ! name ) {
        return reject( il8n('Category name is required.') );
    }

    if ( ! slug ) {
        category.slug = _.toSlug(name);
    }

    return contentTypeQuery().addTag( typeId, category )
        .then( id => {
            Cache.clearGroup( 'contentTags' + typeId );

            return id;
        });
};
setGlobalVar( 'addTag', addTag );

/**
 * Update tag to the database.
 *
 * @param {int} typeId
 * @param {object} category {
 *      @param {int} ID
 *      @param {string} name
 *      @param {string} description
 *      @param {int} parent
 *      @param {string} slug
 * }
 * @returns {Promise<*>}
 */
const updateTag = async (typeId, category) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject( il8n('Invalid content type id.') );
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    let {ID} = category;
    ID = parseInt(ID);

    if ( _.isNaN(ID) ) {
        return reject(il8n('Invalid category ID.') );
    }

    let old = await getTag( typeId, ID ).catch(errorHandler);
    if ( old && old.error ) {
        return reject(old);
    }

    let {slug} = category;
    if ( slug && slug === old.slug ) {
        delete category.slug;
    }

    return contentTypeQuery().updateTag( typeId, category )
        .then( () => {
            Cache.clearGroup( 'contentTags' + typeId );
            Cache.clear( 'contentTagId' + typeId, ID );
            Cache.clear( 'contentTagSlug' + typeId, old.slug );

            return ID;
        });
};
setGlobalVar( 'updateTag', updateTag );

/**
 * Delete tag from the database.
 *
 * @param {int} typeId
 * @param {int} ID
 * @returns {Promise<*>}
 */
const deleteTag = async (typeId, ID) => {
    typeId = parseInt(typeId);

    if ( _.isNaN(typeId) ) {
        return reject(il8n('Invalid content type id.'));
    }

    let contentType = await getContentType(typeId).catch(errorHandler);
    if ( ! contentType || contentType.error ) {
        return reject( il8n('Invalid content type.') );
    }

    ID = parseInt(ID);
    if ( _.isNaN(ID) ) {
        return reject(il8n('Invalid category ID.'));
    }

    let old = await getTag( typeId, ID ).catch(errorHandler);
    if ( ! old || old.error ) {
        return reject( il8n('Invalid tag.') );
    }

    return contentTypeQuery().deleteTag( typeId, ID )
        .then( () => {
            Cache.clearGroup( 'contentTags' + typeId );
            Cache.clear( 'contentTagId' + typeId, ID );
            Cache.clear( 'contentTagSlug' + typeId, old.slug );

            return true;
        });
};
setGlobalVar( 'deleteTag', deleteTag );

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
        return reject( il8n('Invalid content type.') );
    }

    let {contentId} = comment;
    contentId = parseInt(contentId);

    if ( _.isNaN(contentId) ) {
        return reject( il8n('Invalid content ID.') );
    }

    let {authorId, author, authorEmail} = comment;
    if ( ! authorId ) {
        if ( global.currentUser && currentUser.ID ) {
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
                return false;
            }

            if ( key ) {
                Cache.set( 'contentComments' + typeId, key, results );
            }

            return results;
        });
};
setGlobalVar( 'getComments', getComments );