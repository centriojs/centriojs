'use strict';

const _ = require('../../mixin');

class ContentTypeQuery {
    constructor(db) {
        this.db = db;
        this.dbManager = db.execQuery('content_types');
        this.dbProperty = db.execQuery('type_properties');

        this.createContentTables = this.createContentTables.bind(this);
        this.updateContentTable = this.updateContentTable.bind(this);
        this.dropContentTables = this.dropContentTables.bind(this);
    }

    async createContentTables( typeId, options ) {
        let required = ['ID', 'status'],
            indexes = ['ID', 'status'],
            properties = {
                ID: {
                    bsonType: 'int',
                    minimum: 1
                },
                status: {
                    bsonType: 'string',
                    maximumLength: 50
                },
                created: {
                    bsonType: 'date'
                },
                updated: {
                    bsonType: 'date'
                }
            };

        if ( options.public ) {
            properties.template = { bsonType: 'int' };
        }

        if ( options.hierarchical ) {
            properties.parent = { bsonType: 'int' };
        }

        if ( options.hasComments ) {
            properties.comment_status = { enum: ["open", "close"] };
        }

        options.fields = unserialize(options.fields);

        options.fields.map( field => {
            switch ( field ) {
                case 'title' :
                    properties.title = {
                        bsonType: 'string',
                        maximum: 155
                    };
                    break;

                case 'slug' :
                    properties.slug = {
                        bsonType: 'string',
                        maximum: 255
                    };
                    indexes.push('slug');
                    break;

                case 'summary' :
                    properties.summary = {
                        bsonType: 'string',
                        maximum: 255
                    };
                    break;

                case 'content' :
                    properties.content = {
                        bsonType: 'string'
                    };
                    break;

                case 'author' :
                    properties.author = {
                        bsonType: 'int'
                    };
                    indexes.push('author');
                    required.push('author');
                    break;
            }
        });

        let contentDb = this.getContentQuery(typeId);

        properties = await Filter.apply( 'contentColumnFields', properties, contentDb, options );
        indexes = await Filter.apply( 'contentColumnIndexes', indexes, contentDb, options );

        return contentDb.query().then( async ({db, collection, client}) => {
            // Create content collection
            let done = await contentDb.createTable( {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: required,
                        properties: properties
                    }
                }
            }, indexes, db ).catch(errorHandler);

            if ( done && done.error ) {
                client.close();

                return reject(done);
            }

            // Create property collection
            done = this.getPropertyQuery(typeId).createTable({validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['contentId', 'name'],
                        properties: {
                            objectId: {
                                bsonType: 'int'
                            },
                            name: {
                                bsonType: 'string',
                                maximum: 60
                            },
                            value: {
                                bsonType: 'string'
                            }
                        }
                    }
                }}, ['objectId', 'name'], db )
                .catch(errorHandler);

            if ( done && done.error ) {
                client.close();

                return reject(done);
            }

            if ( options.hasComments ) {
                done = await this.getCommentQuery(typeId).createTable({
                    validator: {
                        $jsonSchema: {
                            bsonType: 'object',
                            required: ['ID', 'contentId', 'status', 'comment'],
                            properties: {
                                ID: { bsonType: 'int' },
                                contentId: { bsonType: 'int' },
                                status: {
                                    bsonType: 'string',
                                    enum: ['publish', 'pending', 'spam']
                                },
                                authorId: {
                                    bsonType: 'int'
                                },
                                author: {
                                    bsonType: 'string'
                                },
                                authorEmail: {
                                    bsonType: 'string'
                                },
                                authorUrl: {
                                    bsonType: 'string'
                                },
                                created: {
                                    bsonType: 'date'
                                },
                                updated: {
                                    bsonType: 'date'
                                },
                                comment: {
                                    bsonType: 'string'
                                }
                            }
                        }
                    }
                }, ['ID', 'contentId', 'authorId', 'updated', 'status'], db )
                    .catch(errorHandler);

                if ( done && done.error ) {
                    client.close();

                    return reject(done);
                }
            }

            client.close();

            return resolve(true);
        });
    }

    updateContentTable( typeId, options ) {
        return this.createContentTables( typeId, options );
    }

    async dropContentTables( typeId, content ) {
        /**
         * Trigger to check whether or not to complete remove the content's tables.
         *
         * @param {boolean} drop
         * @type {*|*}
         */
        let drop = await Filter.apply( 'dropContentTables', true, typeId, content );

        if ( ! drop ) {
            return false;
        }

        let contentDb = this.getContentQuery(typeId);

        return contentDb.query().then( ({db, collection, client}) => {
            return contentDb.dropTable(db)
                .then( () => {
                    // Drop properties collection
                    return this.getPropertyQuery(typeId).dropTable(db);
                })
                .then( () => {
                    if ( content.hasComments ) {
                        return this.getCommentQuery(typeId).dropTable(db);
                    }

                    return true;
                })
                .then( () => {
                    if ( content.hasCategories ) {
                        return this.getCategoryQuery(typeId).dropTable(db);
                    }

                    return true;
                })
                .then( () => {
                    if ( content.hasTags ) {
                        return this.getTagQuery(typeId).dropTable(db);
                    }

                    return true;
                })
                .then( () => {
                    client.close();

                    return true;
                })
                .catch( err => {
                    client.close();

                    return err;
                });
        });
    }

    filterSlug( slug, collection ) {
        let $regex = new RegExp( '^' + slug + '*', 'i' );

        return collection.find({slug: {$regex: $regex}}).toArray()
            .then( results => {
                if ( ! results.length ) {
                    return slug;
                }

                let max = 1;

                results.map( result => {
                    let num = result.slug.lastIndexOf("-");

                    if ( num > 0 ) {
                        num = result.slug.substr(num + 1);

                        num = parseInt(num);

                        if ( _.isNaN(num) ) {
                            return;
                        }

                        if ( num > max ) {
                            max = num;
                        }
                    }
                });

                max += 1;

                return slug + '-' + max;
            });
    }

    insert(options) {
        let {name, slug} = options;

        return this.dbManager.query()
            .then( async ({db, collection, client}) => {
                let old = await collection.findOne({$or: {name: name, slug: slug}}).catch(returnFalse);

                if ( old && old.ID ) {
                    client.close();

                    return reject( il8n('Duplicate content type.') );
                }

                let id = await this.dbManager.increment( 'ID', collection ).catch(returnFalse);
                if ( ! id ) {
                    client.close();

                    return reject( il8n('An unexpected error occurred.') );
                }

                options.ID = id;
                options._id = id;

                slug = await this.filterSlug( slug, collection ).catch(errorHandler);
                if ( ! slug || slug.error ) {
                    client.close();

                    return reject(slug);
                }

                options.slug = slug;

                return collection.insertOne(options)
                    .then( results => {
                        client.close();

                        return results.insertedId;
                    })
                    .catch( err => {
                        client.close();

                        return reject(err);
                    });
            });
    }

    update(options) {
        let filter = {ID: options.ID};

        if ( ! options.slug ) {
            return this.dbManager.update( filter, {$set: options} );
        }

        return this.dbManager.query()
            .then( async ({db, collection, client}) => {
                let slug = {collection};

                slug = await this.filterSlug( slug, collection ).catch(errorHandler);

                if ( ! slug || slug.error ) {
                    client.close();

                    return reject(slug);
                }

                options.slug = slug;

                return collection.updateOne(options)
                    .then( results => {
                        client.close();

                        return results;
                    })
                    .catch( err => {
                        client.close();

                        return reject(err);
                    });
            });
    }

    getTypeBy( column, value ) {
        let filter = {};

        filter[column] = value;

        return this.dbManager.get( filter )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                return results.shift();
            });
    }

    get(ID) {
        return this.getTypeBy( 'ID', ID );
    }

    delete(ID) {
        let filter = {ID: ID};

        return this.dbManager.delete(filter);
    }

    getContentTypes(query) {
        let filter = {},
            options = {};

        let {search, status} = query;
        if ( search ) {
            let $regex = new RegExp( search + "*" );
            filter.name = {$regex: $regex};
        }
        if ( status ) {
            filter.status = status;
        }

        if ( query.public ) {
            filter.public = true;
        }

        let {hasCategories, hasTags, hasArchive} = query;
        if ( hasCategories ) {
            filter.hasCategories = true;
        }

        if ( hasTags ) {
            filter.hasTags = true;
        }

        if ( hasArchive ) {
            filter.hasArchive = true;
        }

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;

            if ( offset > 0 ) {
                options.skip = offset;
            }

            options.limit = perPage;
        }

        return this.dbManager.get( filter, options );
    }

    insertTerm( typeId, term ) {
        return this.insertContent( typeId, term );
    }

    updateTerm( typeId, term ) {
        return this.updateContent( typeId, term );
    }

    deleteTerm( typeId, termId ) {
        return this.deleteContent( typeId, termId );
    }

    getTermBy( typeId, column, value ) {
        return this.getContentBy( typeId, column, value );
    }

    getTerms(query) {
        return this.getContents(query);
    }

    __setProperty( propDb, objectId, name, value, isSingle ) {
        return propDb.query()
            .then( async ({db, collection, client}) => {
                let old = await collection.find({
                    objectId: objectId,
                    name: name
                }).toArray();

                let found = false;

                if ( old && old.length ) {
                    old.map( prop => {
                        if ( value === unserialize(prop.value) ) {
                            found = true;
                        }
                    })
                }

                if ( found ) {
                    client.close();
                    return resolve(true);
                }

                let done;
                if ( old && old.length && isSingle ) {
                    let filter = {
                        objectId: objectId,
                        name: name
                    };

                    done = collection.updateOne( filter, {$set: {value: value}});
                } else {
                    done = collection.insertOne({
                        objectId: objectId,
                        name: name,
                        value: value
                    });
                }

                return done.then( ok => {
                    client.close();

                    return ok;
                })
                    .catch( err => {
                        client.close();

                        return reject(err);
                    });
            });
    }

    __deleteProperty( propDb, objectId, name, value ) {
        let filter = {objectId: objectId};

        if ( name ) {
            filter.name = name;
        }

        if ( value ) {
            filter.value = value;
        }

        return propDb.delete( filter );
    }

    __getProperty( propDb, objectId, name, isSingle ) {
        let filter = {objectId: objectId};

        if ( name ) {
            filter.name = name;
        }

        return propDb.get( filter )
            .then( results => {
                if ( ! results.length ) {
                    return isSingle ? false : [];
                }

                let props = {};

                results.map( result => {
                    props[result.name] = unserialize(result.value);
                });

                if ( isSingle ) {
                    // Assumed name is param is specified
                    let values = _.values(props);

                    return values.shift();
                }

                if ( name ) {
                    return _.values(props);
                }

                return props;
            });
    }

    setProperty( typeId, name, value, isSingle ) {
        return this.__setProperty( this.dbProperty, typeId, name, value, isSingle );
    }

    deleteProperty( typeId, name, value ) {
        return this.__deleteProperty( this.dbProperty, typeId, name, value );
    }

    getProperty( typeId, name, isSingle ) {
        return this.__getProperty( this.dbProperty, typeId, name, isSingle );
    }

    getContentQuery(typeId) {
        return this.db.execQuery(`content_${typeId}`);
    }

    insertContent( typeId, content ) {
        let contentDb = this.getContentQuery(typeId);

        return contentDb.query()
            .then( async ({db, collection, client}) => {
                let {slug, status} = content;

                if ( ! status ) {
                    content.status = 'draft';
                }

                slug = await this.filterSlug( slug, collection ).catch(errorHandler);

                if ( ! slug || slug.error ) {
                    client.close();

                    return reject(slug);
                }

                let ID = await contentDb.increment( 'ID', collection ).catch(errorHandler);
                if ( ! ID || ID.error ) {
                    client.close();

                    return reject(ID);
                }

                content.ID = ID;
                content._id = ID;

                if ( ! content.created ) {
                    content.created = _.dbDateFormat();
                }

                if ( ! content.updated ) {
                    content.updated = _.dbDateFormat();
                }

                return collection.insertOne(content)
                    .then( results => {
                        client.close();

                        return results.insertedId;
                    })
                    .catch( err => {
                        client.close();

                        return reject(err);
                    });

            });
    }

    updateContent( typeId, content ) {
        let contentDb = this.getContentQuery(typeId),
            {ID} = content;

        return contentDb.query()
            .then( async ({db, collection, client}) => {
                if ( content.slug ) {
                    let slug = await this.filterSlug( content.slug, collection ).catch(errorHandler);

                    if ( ! slug || slug.error ) {
                        client.close();

                        return reject(slug);
                    }
                }

                content.updated = _.dbDateFormat();

                return collection.updateOne({ID: ID}, {$set: content})
                    .then( () => {
                        client.close();

                        return ID;
                    })
                    .catch(err => {
                        client.close();

                        return reject(err);
                    });
            });
    }

    deleteContent( typeId, contentId ) {
        let filter = {ID: contentId};

        return this.getContentQuery(typeId).delete(filter);
    }

    getContentBy( typeId, column, value ) {
        let filter = {};

        filter[column] = value;

        return this.getContentQuery(typeId).get(filter);
    }

    getContent( typeId, ID ) {
        return this.getContentBy( typeId, 'ID', ID );
    }

    getContents( query ) {
        let {typeId} = query,
            filter = {},
            options = {},
            contentDb = this.getContentQuery(typeId),
            propDb = this.getPropertyQuery(typeId),
            propFilter = {};

        let {status, status__in} = query;
        if ( status ) {
            filter.status = status;
        } else if ( status__in ) {
            filter.status = {$in: status__in};
        }

        let {author, author__in} = query;
        if ( author ) {
            filter.author = author;
        } else if ( author__in ) {
            filter.author = {$in: author__in};
        }

        let addPropFilter = (name, value, compare) => {
            compare = compare || '=';
            let _filter = {};

            _filter.name = name;

            if (value) {
                switch (compare.toLowerCase()) {
                    default :
                        _filter.value = value;
                        break;

                    case 'in' :
                        _filter.value = {$in: value};
                        break;

                    case 'not in' :
                        _filter.value = {$notin: value};
                        break;
                }
            }

            return _filter;
        };

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;

            if ( offset > 0 ) {
                options.skip = offset;
            }

            options.limit = perPage;
        }

        let {property, properties} = query;
        if ( property || properties ) {

            if ( property ) {
                let {name, value, compare} = property;

                propFilter = addPropFilter( name, value, compare );
            } else if ( properties ) {
                properties.map( props => {
                    let {relation} = props.relation || 'AND',
                        _filters = [];

                    relation = 'AND' === relation ? '$and' : '$or';

                    props.property.map( prop => {
                        let {name, value, compare} = prop;

                        _filters.push( addPropFilter( name, value, compare ) );
                    });

                    propFilter[relation] = _filters;
                });
            }

            return propDb.query()
                .then( async ({db, collection, client}) => {
                    let ids = await collection.find( propFilter, options ).toArray().catch(errorHandler);

                    if ( ids && ids.error ) {
                        client.close();

                        return reject(ids);
                    }

                    ids = _.pluck( ids, 'contentId');

                    if ( ! ids.length ) {
                        client.close();
                        return resolve([]);
                    }

                    let contentCol = db.collection( contentDb.table );

                    return contentCol.find({ID: {$in: ids}}, options ).toArray()
                        .then( results => {
                            client.close();

                            if ( ! results.length ) {
                                return resolve([]);
                            }

                            return results;
                        })
                        .catch( err => {
                            client.close();

                            return reject(err);
                        });
                });
        }

        return this.getContentQuery(typeId).get( filter, options );
    }

    getPropertyQuery(typeId) {
        return this.db.execQuery(`content_properties_${typeId}`);
    }

    setContentProperty( props, isSingle ) {
        let {typeId, contentId, name, value} = props;

        return this.__setProperty( this.getPropertyQuery(typeId), contentId, name, value, isSingle );
    }

    getContentProperty( typeId, contentId, name, isSingle ) {
        return this.__getProperty( this.getPropertyQuery(typeId), contentId, name, isSingle );
    }

    getPropertiesBy( typeId, column, value ) {
        let filter = {};

        filter[column] = value;

        return this.getPropertyQuery(typeId).get( filter );
    }

    deleteContentProperty( typeId, contentId, name, value ) {
        return this.__deleteProperty( this.getPropertyQuery(typeId), contentId, name, value );
    }

    getCommentQuery(typeId) {
        return this.db.execQuery(`comments_${typeId}`);
    }

    addComment( typeId, comment ) {
        let commentDb = this.getCommentQuery(typeId);

        comment.created = _.dbDateFormat();
        comment.updated = _.dbDateFormat();

        if ( ! comment.status ) {
            comment.status = 'pending';
        }

        return commentDb.query()
            .then( async ({db, collection, client}) => {
                let id = await commentDb.increment( 'ID', collection ).catch(errorHandler);

                if ( id && id.error ) {
                    client.close();

                    return reject(id);
                }

                comment.ID = id;
                comment._id = id;

                return collection.insertOne(comment)
                    .then( results => {
                        client.close();

                        return results.insertedId;
                    })
                    .catch( err => {
                        client.close();

                        return reject(err);
                    });
            });
    }

    updateComment( typeId, comment ) {
        let filter = {ID: comment.ID};
        comment.updated = _.dbDateFormat();

        return this.getCommentQuery(typeId).update( filter, {$set: comment});
    }

    deleteComment( typeId, commentId ) {
        let filter = {ID: commentId};

        return this.getCommentQuery(typeId).delete(filter);
    }

    getComment( typeId, commentId ) {
        return this.getCommentQuery(typeId).get({ID: commentId});
    }

    getComments(typeId, query) {
        let filter = {},
            options = {};

        let {contentId} = query;
        if ( contentId ) {
            filter.contentId = contentId;
        }

        let {include, exclude} = query;
        if ( include ) {
            filter.ID = {$in: include};
        } else if ( exclude ) {
            filter.ID = {$notin: exclude};
        }

        let {authorId, author} = query;
        if ( authorId ) {
            filter.authorId = authorId;
        } else if ( author ) {
            filter.author = author;
        }

        let {order, orderby} = query;
        order = order || 'ASC';

        if ( orderby ) {
            order = 'asc' === order.toLowerCase() ? 1 : -1;
            let sorter = {};
            sorter[orderby] = order;

            options.sort = sorter;
        }

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;

            if ( offset > 0 ) {
                options.skip = offset;
            }

            options.limit = perPage;
        }

        return this.getCommentQuery(typeId).get( filter, options );
    }
}
module.exports = db => {
    return new ContentTypeQuery(db);
};