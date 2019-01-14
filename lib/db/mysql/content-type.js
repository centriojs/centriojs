'use strict';

const _ = require('../../mixin');

const createCommentTable = db => {
    let commentsColumns = [
        '`ID` BIGINT(20) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT',
        '`contentId` BIGINT(20) UNSIGNED NOT NULL',
        '`authorId` BIGINT(20) DEFAULT 0',
        '`author` VARCHAR(100)',
        '`authorEmail` VARCHAR(100)',
        '`authorUrl` VARCHAR(160)',
        '`comment` LONGTEXT',
        '`status` ENUM ("publish", "pending", "spam") DEFAULT "pending"',
        '`created` TIMESTAMP',
        '`updated` TIMESTAMP',
        'Index (`ID`, `contentId`, `authorId`, `author`, `status`)'
    ];

    return db.createTable(commentsColumns).catch(errorHandler);
};

class ContentTypeQuery {
    constructor(db) {
        this.db = db;
        this.dbManager = db.execQuery('content_types');
        this.dbProperty = db.execQuery('type_properties');
        this.dbEndPoint = db.execQuery('endpoint');

        this.createContentTables = this.createContentTables.bind(this);
        this.updateContentTable = this.updateContentTable.bind(this);
        this.dropContentTables = this.dropContentTables.bind(this);
    }

    async createContentTables( typeId, options ) {
        let db = this.getContentQuery(typeId);

        let columns = [
                '`ID` BIGINT(20) NOT NULL PRIMARY KEY AUTO_INCREMENT',
                '`created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                '`updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
            ],
            indexes = ['ID', 'slug'],
            isTax = 'tax' === options.type;

        if ( ! isTax ) {
            columns.push('`status` VARCHAR(50) DEFAULT "draft"');
        }

        if ( options.hierarchical ) {
            columns.push('`parent` BIGINT(20) DEFAULT 0');
        }

        if ( options.hasThumbnail ) {
            columns.push('`thumbId` BIGINT(20)');
        }

        options.fields = unserialize(options.fields);

        options.fields.map( field => {
            switch( field ) {
                case 'title' :
                    columns.push('`title` VARCHAR(155) NOT NULL');
                    break;

                case 'name' :
                    columns.push('`name` VARCHAR(155) NOT NULL');
                    break;

                case 'slug' :
                    columns.push('`slug` VARCHAR(255)');
                    indexes.push('slug');
                    break;

                case 'description' :
                    columns.push('`description` VARCHAR(255)');
                    break;

                case 'content' :
                    columns.push('`content` LONGTEXT');
                    break;

                case 'author' :
                    columns.push('`author` BIGINT(20) NOT NULL');
                    indexes.push('author');
                    break;
            }
        });

        columns = await Filter.apply( 'contentColumnFields', columns, db, options );
        indexes = await Filter.apply( 'contentColumnIndexes', indexes, db, options );

        if ( indexes.length ) {
            indexes = _.uniq(indexes);
            columns.push('Index (`' + indexes.join('`, `') + '`)');
        }

        let done = await db.createTable( columns ).catch(errorHandler);
        if ( ! done || done.error ) {
            return reject(done);
        }

        let propertyQuery = this.getPropertyQuery(typeId);
        let property = [
            '`objectId` BIGINT(20) UNSIGNED NOT NULL',
            '`name` VARCHAR(160) NOT NULL',
            '`value` LONGTEXT',
            'Index (`objectId`, `name`)'
        ];

        let propertyDone = await propertyQuery.createTable(property);
        if ( ! propertyDone || propertyDone.error ) {
            return reject(propertyDone);
        }

        if ( options.hasComments ) {
            let doneComments = await createCommentTable(this.getCommentQuery(typeId)).catch(errorHandler);
            if ( ! doneComments || doneComments.error ) {
                return reject(doneComments);
            }
        }

        return resolve(true);
    }

    async updateContentTable( typeId, options ) {
        let db = this.getContentQuery(typeId),
            fields = options.fields,
            structure = await db.getTableStructure().catch(errorHandler);

        let columns = [],
            fieldObj = _.toObject(fields),
            allowed =['ID', 'status', 'created', 'updated'];

        if ( 'content' === options.type ) {
            if ( ! structure.status ) {
                columns.push('ADD `status` ENUM ("public", "private", "pending", "draft") DEFAULT "draft"');
            }

            if ( ! structure.created ) {
                columns.push('ADD `created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            }

            if ( ! structure.updated ) {
                columns.push('ADD `updated` TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
            }
        }

        if ( options.hierarchical ) {
            allowed.push('parent');

            if ( ! structure.parent ) {
                columns.push('ADD `parent` BIGINT(20) DEFAULT 0');
            }
        }

        if ( options.hasComments ) {
            allowed.push('comment_status');

            if ( ! structure.comment_status ) {
                columns.push('ADD `comment_status` ENUM ("open", "close") DEFAULT "open"');
            }
        }

        if ( options.hasThumbnail ) {
            allowed.push('thumb_id');

            if ( ! structure.thumbId ) {
                columns.push('ADD `thumbId` BIGINT(20)');
            }
        }

        fields.map( field => {
            if ( structure[field] ) {
                return;
            }

            switch ( field ) {
                case 'title' :
                    columns.push('ADD `title` VARCHAR(155) NOT NULL AFTER `ID`');
                    break;

                case 'name' :
                    columns.push('ADD `name` VARCHAR(155) NOT NULL AFTER `ID`');
                    break;

                case 'slug' :
                    columns.push('ADD `slug` VARCHAR(255)');
                    break;

                case 'description' :
                    columns.push('ADD `description` VARCHAR(255)');
                    break;

                case 'content' :
                    columns.push('ADD `content` LONGTEXT');
                    break;

                case 'author' :
                    columns.push('ADD `author` BIGINT(20) NOT NULL');
                    break;
            }
        });

        _.keys(structure).map( column => {
            if ( fieldObj[column] || _.contains( allowed, column ) ) {
                return;
            }

            columns.push('DROP `' + column + '`');
        });

        columns = await Filter.apply( 'updateContentColumnFields', columns, db, options, structure );

        let done = await db.exec('ALTER TABLE `' + db.table + '` ' + columns.join(', ')).catch(errorHandler);
        if ( ! done || done.error ) {
            return reject(done);
        }

        if ( options.hasComments ) {
            let comments = await createCommentTable(this.getCommentQuery(typeId)).catch(errorHandler);

            if ( ! comments || comments.error ) {
                return reject(comments);
            }
        }

        return true;
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

        // Drop content table
        await this.getContentQuery(typeId).dropTable().catch(errorHandler);

        // Drop settings table
        await this.getPropertyQuery(typeId).dropTable().catch(errorHandler);

        await this.getCommentQuery(typeId).dropTable().catch(errorHandler);

        return true;
    }

    filterSlug(db, slug) {
        let sql = 'SELECT `ID`, `slug` FROM ?? WHERE `slug` LIKE ?',
            format = [db.table, slug + '%'];

        return db.query( sql, format )
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

    async insert(options) {
        options.fields = serialize(options.fields);

        let {slug} = options;

        slug = await this.filterSlug( this.dbManager, slug ).catch(errorHandler);
        if ( ! slug || slug.error ) {
            return reject(slug);
        }

        options.slug = slug;

        return this.dbManager.insert(options)
            .then( results => {
                return results.insertId;
            });
    }

    async update(options) {

        let {ID} = options,
            filter = ['`ID` = ?'],
            format = [ID];

        let {slug} = options;

        slug = await this.filterSlug( this.dbManager, slug ).catch(errorHandler);
        if ( ! slug || slug.error ) {
            return reject(slug);
        }

        options.slug = slug;

        return this.dbManager.update( filter, options, format );
    }

    getTypeBy( column, value ) {
        let sql = 'SELECT * FROM ?? WHERE `' + column + '` = ?',
            format = [this.dbManager.table, value];

        return this.dbManager.get( sql, format )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                let content = results.shift();

                content.fields = unserialize(content.fields);

                return content;
            });
    }

    get(ID) {
        return this.getTypeBy( 'ID', ID );
    }

    delete(ID) {
        let filter = ['`ID` = ?'],
            format = [ID];

        return this.dbManager.delete( filter, format );
    }

    getContentTypes(query) {
        let sql = 'SELECT * FROM ??',
            where = [],
            condition = [],
            format = [this.dbManager.table];

        let {search, status} = query;
        if ( search ) {
            where.push('`name` LIKE ?');
            format.push(search);
        }

        if ( status ) {
            where.push('`status` = ?');
            format.push(status);
        }

        if ( query.public ) {
            where.push('`public` = ?');
            format.push(true);
        }

        let {hasCategories, hasTags} = query;
        if ( hasCategories ) {
            where.push('`hasCategories` => ?');
            format.push(true);
        }

        if ( hasTags ) {
            where.push('`hasTags` = ?');
            format.push(true);
        }

        if ( where.length ) {
            sql += ' WHERE ' + where.join(' AND ');
        }

        let {page, perPage} = query;
        page = page || 1;
        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;

            condition.push(`LIMIT ${offset}, ${perPage}`);
        }

        if ( condition.length ) {
            sql += ' ' + condition.join(', ');
        }

        return this.dbManager.get( sql, format )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                let contents = [];

                results.map( result => {
                    result.fields = unserialize(result.fields);

                    contents.push(result);
                });

                return contents;
            });
    }

    async __setProperty( propDb, objectId, name, value, isSingle ) {
        // Check for existing property
        let old = await this.__getProperty( propDb, objectId, name ).catch(returnFalse),
            found = false;

        if ( old && old.length ) {
            old.map( val => {
                if ( val === value ) {
                    found = true;
                }
            });
        }

        if ( found ) {
            return resolve(true);
        }

        if ( old && old.length && isSingle ) {
            let filter = ['`name` = ?'],
                format = [name];

            return propDb.update( filter, {value: value}, format );
        }

        let columns = {
            objectId: objectId,
            name: name,
            value: value
        };

        return propDb.insert( columns );
    }

    __deleteProperty( propDb, objectId, name, value ) {
        let filter = ['`objectId` = ?'],
            format = [objectId];

        if ( name ) {
            filter.push('`name` = ?');
            format.push(name);
        }

        if ( value ) {
            filter.push('`value` = ?');
            format.push(value);
        }

        return propDb.delete( filter, format );
    }

    __getProperty( propDb, objectId, name, isSingle ) {
        let query = {objectId: objectId};

        if ( name ) {
            query.name = name;
        }

        return this.__getProperties( propDb, query )
            .then( results => {
                if ( ! results.length ) {
                    return isSingle ? false : [];
                }

                if ( name ) {
                    let values = _.pluck( results, 'value' );

                    if ( isSingle ) {
                        return values.shift();
                    }

                    return values;
                }

                let props = {};

                results.map( result => {
                    props[result.name] = result.value;
                });

                return props;
            });
    }

    __getProperties( propDb, query ) {
        let sql = 'SELECT * FROM ??',
            format = [propDb.table],
            where = [];

        let {name, name__in, value} = query;
        if ( name ) {
            where.push('`name` = ?');
            format.push(name);
        } else if ( name__in ) {
            where.push('`name` IN (?)');
            format.push(name__in);
        }

        if ( value ) {
            where.push('`value` = ?');
            format.push(serialize(value));
        }

        let {objectId, objectId__in} = query;
        if ( objectId ) {
            where.push('`objectId` = ?');
            format.push(objectId);
        } else if (objectId__in) {
            where.push('`objectId` IN (?)');
            format.push(objectId__in);
        }

        if ( where.length ) {
            sql += ' WHERE ' + where.join(' AND ');
        }

        return propDb.get( sql, format )
            .then( results => {
                if ( ! results.length ) {
                    return [];
                }

                let props = [];

                results.map( result => {
                    result.value = unserialize(result.value);

                    props.push(result);
                });

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

    getProperties( query ) {
        return this.__getProperties( this.dbProperty, query );
    }

    getContentQuery(typeId) {
        return this.db.execQuery(`content_${typeId}`);
    }

    async insertContent( typeId, content) {
        let db = this.getContentQuery(typeId);

        if ( ! content.created ) {
            content.created = _.dbDateFormat();
        }

        if ( ! content.updated ) {
            content.updated = _.dbDateFormat();
        }

        if ( content.slug ) {
            let slug = await this.filterSlug( db, content.slug ).catch(errorHandler);
            if ( ! slug || slug.error ) {
                return reject(il8n('An unexpected error occurred.') );
            }

            content.slug = slug;
        }

        return db.insert(content)
            .then( results => {
                return results.insertId;
            });
    }

    async updateContent(typeId, content) {
        let {ID} = content,
            filter = ['`ID` = ?'],
            format = [ID];

        content.updated = _.dbDateFormat();

        let db = this.getContentQuery(typeId);
        if ( content.slug ) {
            let slug = await this.filterSlug( db, content.slug ).catch(errorHandler);

            if ( ! slug || slug.error ) {
                return reject( il8n('An unexpected error occurred.') )
            }

            content.slug = slug;
        }

        return db.update( filter, content, format );
    }

    deleteContent(typeId, ID) {
        let filter = ['`ID` = ?'],
            format = [ID];

        return this.getContentQuery(typeId).delete( filter, format );
    }

    getContentBy( typeId, column, value ) {
        let db = this.getContentQuery(typeId),
            sql = 'SELECT * FROM ?? WHERE `' + column + '` = ?',
            format = [db.table, value];

        return db.get( sql, format );
    }

    getContent(typeId, ID) {
        return this.getContentBy( typeId, 'ID', ID );
    }

    getContents(query) {
        let {typeId} = query,
            db = this.getContentQuery(typeId),
            propDb = this.getPropertyQuery(typeId),
            sql = 'SELECT t1.* FROM ?? AS t1',
            where = [],
            condition = [],
            format = [db.table];

        let {author, author__in} = query;
        if ( author ) {
            where.push('t1.`author` = ?');
            format.push(author);
        } else if ( author__in ) {
            where.push('t1.`author` IN (?)');
            format.push(author__in);
        }

        let {status, status__in, status__not_in} = query;
        if ( status ) {
            where.push('t1.`status` = ?');
            format.push(status);
        } else if ( status__in ) {
            where.push('t1.`status` IN (?)');
            format.push(status__in);
        } else if ( status__not_in ) {
            where.push('t1.`status` NOT IN (?)');
            format.push(status__not_in);
        }

        let {include, exclude} = query;
        if ( include ) {
            where.push('t1.`ID` IN (?)');
            format.push(include);
        }
        if ( exclude ) {
            where.push('t1.`ID` NOT IN (?)');
            format.push(exclude);
        }

        let addPropWhere = (name, value, compare) => {
            compare = compare || '=';

            let pWhere = [];

            pWhere.push('t2.`name` = ?');
            format.push(name);

            if ( value ) {
                switch( compare.toLowerCase() ) {
                    default :
                        pWhere.push('CAST(t2.`value` AS CHAR) = ?');
                        break;

                    case 'in' :
                        pWhere.push('CAST(t2.`value` AS CHAR) IN (?)');
                        break;

                    case 'not in' :
                        pWhere.push('CAST(t2.`value` AS CHAR) NOT IN (?)');
                        break;
                }
                format.push(value);
            }

            return '(' + pWhere.join(' AND ') + ')';
        };

        let {property, properties} = query;
        if ( property || properties ) {
            sql += ' INNER JOIN ?? AS t2 ON t1.`ID` = t2.`objectId`';
            format.push(propDb.table);

            if ( property ) {
                let {name, value, compare} = property;
                where.push(addPropWhere( name, value, compare ));
            } else {
                properties.map( prop => {
                    let relation = prop.relation || 'AND',
                        _where = [];

                    prop.property.map( props => {
                        let {name, value, compare} = props;
                        _where.push( addPropWhere( name, value, compare ) );
                    });

                    _where = _where.join(' ' + relation + ' ');

                    where.push('(' + _where + ')');
                });
            }

            condition.push('GROUP BY `ID`');
        }

        if ( where.length ) {
            sql += ' WHERE '+ where.join(' AND ');
        }

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;

            condition.push(`LIMIT ${offset}, ${perPage}`);
        }

        if ( condition.length ) {
            sql += ' ' + condition.join(', ');
        }

        return db.get( sql, format );
    }

    getPropertyQuery(typeId) {
        return this.db.execQuery(`content_properties_${typeId}`);
    }

    setContentProperty( props, isSingle ) {
        let {typeId, contentId, name, value} = props,
            db = this.getPropertyQuery(typeId);

        return this.__setProperty( db, contentId, name, value, isSingle );
    }

    getContentProperty( typeId, ID, name, isSingle ) {
        return this.__getProperty( this.getPropertyQuery(typeId), ID, name, isSingle );
    }

    getContentProperties( typeId, query ) {
        return this.__getProperties( this.getPropertyQuery(typeId), query );
    }

    deleteContentProperty( typeId, ID, name, value ) {
        return this.__deleteProperty( this.getPropertyQuery(typeId), ID, name, value );
    }

    insertTerm( typeId, content ) {
        return this.insertContent( typeId, content );
    }

    updateTerm( typeId, content ) {
        return this.updateContent( typeId, content );
    }

    deleteTerm( typeId, ID ) {
        return this.deleteContent( typeId, ID );
    }

    getTermBy( typeId, column, value ) {
        return this.getContentBy( typeId, column, value );
    }

    getTerm( typeId, ID ) {
        return this.getTermBy( typeId, ID );
    }

    getTerms(query) {
        let {typeId} = query,
            db = this.getContentQuery(typeId),
            propDb = this.getPropertyQuery(typeId),
            sql = 'SELECT t1.* FROM ?? AS t1',
            where = [],
            condition = [],
            format = [db.table];

        let {search} = query;
        if ( search ) {
            where.push('t1.`name` LIKE ?');
            format.push(search);
        }

        let {include, exclude} = query;
        if ( include ) {
            where.push('t1.`ID` IN (?)');
            format.push(include);
        }
        if ( exclude ) {
            where.push('t1.`ID` NOT IN (?)');
            format.push(exclude);
        }

        let addPropWhere = (name, value, compare) => {
            compare = compare || '=';

            let pWhere = [];

            pWhere.push('t2.`name` = ?');
            format.push(name);

            if ( value ) {
                switch( compare.toLowerCase() ) {
                    default :
                        pWhere.push('CAST(t2.`value` AS CHAR) = ?');
                        break;

                    case 'in' :
                        pWhere.push('CAST(t2.`value` AS CHAR) IN (?)');
                        break;

                    case 'not in' :
                        pWhere.push('CAST(t2.`value` AS CHAR) NOT IN (?)');
                        break;
                }
                format.push(value);
            }

            return '(' + pWhere.join(' AND ') + ')';
        };

        let {property, properties} = query;
        if ( property || properties ) {
            sql += ' INNER JOIN ?? AS t2 ON t1.`ID` = t2.`objectId`';
            format.push(propDb.table);

            if ( property ) {
                let {name, value, compare} = property;
                where.push(addPropWhere( name, value, compare ));
            } else {
                properties.map( prop => {
                    let relation = prop.relation || 'AND',
                        _where = [];

                    prop.property.map( props => {
                        let {name, value, compare} = props;
                        _where.push( addPropWhere( name, value, compare ) );
                    });

                    _where = _where.join(' ' + relation + ' ');

                    where.push('(' + _where + ')');
                });
            }

            condition.push('GROUP BY `ID`');
        }

        if ( where.length ) {
            sql += ' WHERE '+ where.join(' AND ');
        }

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;

            condition.push(`LIMIT ${offset}, ${perPage}`);
        }

        if ( condition.length ) {
            sql += ' ' + condition.join(', ');
        }

        return db.get( sql, format );
    }

    getCommentQuery(typeId) {
        return this.db.execQuery(`comments_${typeId}`);
    }

    addComment( typeId, comment ) {
        comment.created = _.dbDateFormat();
        comment.updated = _.dbDateFormat();

        return this.getCommentQuery(typeId).insert(comment)
            .then( results => {
                return results.insertId;
            });
    }

    updateComment( typeId, comment ) {
        let filter = ['`ID` = ? AND `contentId` = ?'],
            {ID, contentId} = comment,
            format = [ID, contentId];

        comment.updated = _.dbDateFormat();

        return this.getCommentQuery(typeId).update( filter, comment, format );
    }

    deleteComment( typeId, commentId ) {
        let filter = ['`ID` = ?'],
            format = [commentId];

        return this.getCommentQuery(typeId).delete( filter, format );
    }

    getComment( typeId, commentId ) {
        let sql = 'SELECT * FROM ?? WHERE `ID` = ?',
            db = this.getCommentQuery(typeId),
            format = [db.table, commentId];

        return db.get( sql, format );
    }

    getComments( typeId, query) {
        let db = this.getCommentQuery(typeId),
            sql = 'SELECT * FROM ??',
            where = [],
            condition = [],
            format = [db.table];

        let {contentId} = query;
        if ( contentId ) {
            where.push('`contentId` = ?');
            format.push(contentId);
        }

        let {include, exclude} = query;
        if ( include ) {
            where.push('`ID` IN (?)');
            format.push(include);
        } else if ( exclude ) {
            where.push('`ID` NOT IN (?)');
            format.push(exclude);
        }

        let {authorId, author} = query;
        if ( authorId ) {
            where.push('`authorId` = ?');
            format.push(authorId);
        } else if ( author ) {
            where.push('`author` = ?');
            format.push(author);
        }

        if ( where.length ) {
            sql += ' WHERE ' + where.join(' AND ');
        }

        let {order, orderby} = query;
        order = order || 'ASC';
        orderby = orderby || 'created';

        condition.push('ORDER BY `' + orderby + '` ' + order);

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;
            condition.push(`LIMIT ${offset}, ${perPage}`);
        }

        if ( condition.length ) {
            sql += ' ' + condition.join(', ');
        }

        return db.get( sql, format );
    }
}
module.exports = db => {
    return new ContentTypeQuery(db);
};