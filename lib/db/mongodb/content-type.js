'use strict';

const _ = require('../../mixin');

class ContentTypeQuery {
    constructor(db) {
        this.db = db;
        this.dbManager = db.execQuery('content_types');

        this.createContentCollections = this.createContentCollections.bind(this);
        appEvent.on( 'insertedContentType', this.createContentCollections );

        this.updateContentCollections = this.updateContentCollections.bind(this);
        appEvent.on( 'updatedContentType', this.updateContentCollections );

        this.deleteContentCollections = this.deleteContentCollections.bind(this);
        appEvent.on( 'deletedContentType', this.deleteContentCollections );

        this.onDeletedContent = this.onDeletedContent.bind(this);
        appEvent.on( 'deletedContent', this.onDeletedContent );
    }

    async createContentCollections( typeId, options ) {
        let required = ['ID', 'status'],
            indexes = ['ID', 'status'],
            properties = {
                ID: {
                    bsonType: 'int'
                },
                status: {
                    bsonType: 'enum',
                    enum: ['public', 'private', 'pending', 'draft'],
                    default: 'draft'
                },
                created: {
                    bsonType: 'date'
                },
                updated: {
                    bsonType: 'date'
                }
            };

        if ( options.public ) {
            properties.template = {
                bsonType: 'int'
            };
        }

        if ( options.hierarchical ) {
            properties.parent = {
                bsonType: 'int'
            };
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

        let typeSchema = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: required,
                    properties: properties
                }
            }
        },
            db = this.getContentQuery(typeId);

        properties = await Filter.apply( 'contentColumnFields', properties, db, options );
        indexes = await Filter.apply( 'contentColumnIndexes', indexes, db, options );

        let done = await db.createTable( typeSchema, indexes ).catch(errorHandler);
        if ( ! done || done.error ) {
            return reject(done);
        }

        let propertySchema = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: [],
                    properties: {
                        contentId: {
                            bsonType: 'int',
                            required: true
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
            }
        };

        done = await this.getPropertyQuery(typeId).createTable( propertySchema, ['contentId', 'name'] ).catch(errorHandler);
        if ( ! done || done.error ) {
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
                                    bsonType: 'enum',
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
                }, ['ID', 'contentId', 'authorId', 'updated', 'status'] )
                .catch(errorHandler);

            if ( ! done || done.error ) {
                return reject(done);
            }

            return resolve(true);
        }

        if ( options.hasCategories ) {
            done = await this.getCategoryQuery(typeId).createTable({
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['ID', 'name'],
                        properties: {
                            ID: { bsonType: 'int' },
                            name: {
                                bsonType: 'string',
                                maximum: 100
                            },
                            description: {
                                bsonType: 'string',
                                maximum: 255
                            },
                            slug: {
                                bsonType: 'string',
                                maximum: 150
                            }
                        }
                    }
                }
            }, ['ID', 'name', 'slug'] )
                .catch(errorHandler);

            if ( ! done || done.error ) {
                return reject(done);
            }
        }

        if ( options.hasTags ) {
            done = await this.getTagQuery(typeId).createTable({
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['ID', 'name'],
                        properties: {
                            ID: { bsonType: 'int' },
                            name: {
                                bsonType: 'string',
                                maximum: 100
                            },
                            description: {
                                bsonType: 'string',
                                maximum: 255
                            },
                            slug: {
                                bsonType: 'string',
                                maximum: 150
                            }
                        }
                    }
                }
            }, ['ID', 'name', 'slug'] )
                .catch(errorHandler);

            if ( ! done || done.error ) {
                return reject(done);
            }
        }
    }

    updateContentCollections( typeId, options ) {
        return this.createContentCollections( typeId, options );
    }

    async deleteContentCollections( typeId, content ) {
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

        // Drop content table
        await this.getContentQuery(typeId).dropTable().catch(errorHandler);

        // Drop settings table
        await this.getPropertyQuery(typeId).dropTable().catch(errorHandler);

        await this.getCommentQuery(typeId).dropTable().catch(errorHandler);

        await this.getCategoryQuery(typeId).dropTable().catch(errorHandler);

        await this.getTagQuery(typeId).dropTable().catch(errorHandler);

        return true;
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

                        return err;
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

        let {status} = query;
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

    getContentQuery(typeId) {
        return this.db.execQuery(`content_${typeId}`);
    }

    insertContent( typeId, content ) {
        let contentDb = this.getContentQuery(typeId);

        return contentDb.query()
            .then( async ({db, collection, client}) => {
                let {slug} = content;

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

                        return err;
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

                        return err;
                    });
            });
    }

    async onDeletedContent( typeId, contentId, options ) {
        let filter = {contentId: contentId};

        // Delete properties of this content
        await this.deleteContentProperty( typeId, contentId ).catch(errorHandler);

        // @todo: delete comments

        return true;
    }

    deleteContent( typeId, contentId ) {
        let filter = {ID: contentId};

        return this.getContentQuery(typeId).delete(filter);
    }

    getContentBy( typeId, column, value ) {
        let filter = {};

        filter[column] = value;

        return this.getContentQuery(typeId).get(filter)
            .then( results => {
                if ( ! results.length ) {
                    return reject(false);
                }

                let result = results.shift();

                if ( ! result.ID ) {
                    return reject(false);
                }

                return result;
            });
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

                            return err;
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

        return this.getPropertyQuery(typeId).query()
            .then( async ({db, collection, client}) => {
                let filter = {contentId: contentId, name: name};

                let oldProps = await collection.find(filter).toArray().catch(errorHandler);

                if ( oldProps && oldProps.error ) {
                    client.close();
                    return reject(oldProps);
                }

                let columns = _.pick( props, ['contentId', 'name', 'value'] );

                if ( ! oldProps || ! oldProps.length ) {
                    return collection.insertOne(columns)
                        .then( ok => {
                            client.close();

                            return ok;
                        })
                        .catch( err => {
                            client.close();

                            return err;
                        });
                }

                let found = false;

                oldProps.map( oldProp => {
                    if ( _.isEqual( oldProp.value, columns.value ) ) {
                        found = true;
                    }
                });

                if ( found ) {
                    return resolve(true);
                }

                if ( isSingle ) {
                    return collection.updateOne( filter, {$set: {value: value}} )
                        .then( () => {
                            client.close();

                            return true;
                        })
                        .catch( err => {
                            client.close();

                            return err;
                        });
                }

                return collection.insertOne(columns)
                    .then( ok => {
                        client.close();

                        return true;
                    })
                    .catch( err => {
                        client.close();

                        return err;
                    });
            });
    }

    getContentProperty( typeId, contentId, name ) {
        return this.getPropertyQuery(typeId).get({contentId: contentId, name: name});
    }

    getContentProperties( typeId, contentId ) {
        return this.getPropertyQuery(typeId).get({contentId: contentId});
    }

    deleteContentProperty( typeId, contentId, name, value ) {
        let filter = {contentId: contentId};

        if ( name ) {
            filter.name = name;
        }

        if ( value ) {
            filter.value = value;
        }

        return this.getPropertyQuery(typeId).delete(filter);
    }

    getCommentQuery(typeId) {
        return this.db.execQuery(`comments_${typeId}`);
    }

    getCategoryQuery(typeId) {
        return this.db.execQuery(`categories_${typeId}`);
    }

    getTagQuery(typeId) {
        return this.db.execQuery(`tags_${typeId}`);
    }
}
module.exports = db => {
    return new ContentTypeQuery(db);
};