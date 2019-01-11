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

const createTaxTable = db => {
    let columns = [
        '`ID` BIGINT(20) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT',
        '`parent` BIGINT(20) DEFAULT 0',
        '`name` VARCHAR(100) NOT NULL',
        '`description` VARCHAR(255)',
        '`slug` VARCHAR(150) NOT NULL',
        'Index (`ID`, `name`, `slug`)'
    ];

    return db.createTable(columns);
};

class ContentTypeQuery {
    constructor(db) {
        this.db = db;
        this.dbManager = db.execQuery('content_types');

        this.createContentTables = this.createContentTables.bind(this);
        appEvent.on( 'insertedContentType', this.createContentTables );

        this.updateContentTable = this.updateContentTable.bind(this);
        appEvent.on( 'updatedContentType', this.updateContentTable );

        this.dropContentTables = this.dropContentTables.bind(this);
        appEvent.on( 'deletedContentType', this.dropContentTables );

        this.onDeleteContent = this.onDeleteContent.bind(this);
        appEvent.on( 'deletedContent', this.onDeleteContent );
    }

    async createContentTables( typeId, options ) {
        let db = this.getContentQuery(typeId);

        let columns = [
                '`ID` BIGINT(20) NOT NULL PRIMARY KEY AUTO_INCREMENT',
                '`status` ENUM ("public", "private", "pending", "draft") DEFAULT "draft"',
                '`created` TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                '`updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
            ],
            indexes = ['ID'];

        if ( options.public ) {
            columns.push('`component` BIGINT(20) DEFAULT 0');
        }

        if ( options.hierarchical ) {
            columns.push('`parent` BIGINT(20) DEFAULT 0');
        }

        if ( options.hasComments ) {
            columns.push('`comment_status` ENUM("open", "close") DEFAULT "open"')
        }

        if ( options.hasThumbnail ) {
            columns.push('`thumb_id` BIGINT(20)');
        }

        options.fields = unserialize(options.fields);

        options.fields.map( field => {
            switch( field ) {
                case 'title' :
                    columns.push('`title` VARCHAR(155) NOT NULL');
                    break;

                case 'slug' :
                    columns.push('`slug` VARCHAR(255)');
                    indexes.push('slug');
                    break;

                case 'summary' :
                    columns.push('`summary` VARCHAR(255)');
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
            columns.push('Index (`' + indexes.join('`, `') + '`)');
        }

        let done = await db.createTable(columns).catch(errorHandler);
        if ( ! done || done.error ) {
            return reject(done);
        }

        let propertyQuery = this.getPropertyQuery(typeId);
        let property = [
            '`contentId` BIGINT(20) UNSIGNED NOT NULL',
            '`name` VARCHAR(160) NOT NULL',
            '`value` LONGTEXT',
            'Index (`contentId`, `name`)'
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

        if ( options.hasCategories ) {
            let category = await createTaxTable(this.getCategoryQuery(typeId)).catch(errorHandler);

            if ( ! category || category.error ) {
                return reject(category);
            }
        }

        if ( options.hasTags ) {
            let tags = await createTaxTable(this.getTagQuery(typeId)).catch(errorHandler);

            if ( ! tags || tags.error ) {
                return reject(tags);
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

        if ( options.public ) {
            allowed.push('template');

            if ( ! structure.template ) {
                columns.push('ADD `component` BIGINT(20) DEFAULT 0');
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

            if ( ! structure.thumb_id ) {
                columns.push('ADD `thumb_id` BIGINT(20)');
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

                case 'slug' :
                    columns.push('ADD `slug` VARCHAR(255)');
                    break;

                case 'summary' :
                    columns.push('ADD `summary` VARCHAR(255)');
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

        if ( options.hasCategories ) {
            let category = await createTaxTable(this.getCategoryQuery(typeId)).catch(errorHandler);

            if ( ! category || category.error ) {
                return reject(category);
            }
        }

        if ( options.hasTags ) {
            let tags = await createTaxTable(this.getTagQuery(typeId)).catch(errorHandler);

            if ( ! tags || tags.error ) {
                return reject(tags);
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

        await this.getCategoryQuery(typeId).dropTable().catch(errorHandler);

        await this.getTagQuery(typeId).dropTable().catch(errorHandler);

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

        let {slug, settings} = options;

        slug = await this.filterSlug( this.dbManager, slug ).catch(errorHandler);
        if ( ! slug || slug.error ) {
            return reject(slug);
        }

        options.slug = slug;
        options.settings = serialize(options.settings);

        return this.dbManager.insert(options)
            .then( results => {
                return results.insertId;
            });
    }

    async update(options) {

        let {ID} = options,
            filter = ['`ID` = ?'],
            format = [ID];

        let {slug, settings} = options;

        slug = await this.filterSlug( this.dbManager, slug ).catch(errorHandler);
        if ( ! slug || slug.error ) {
            return reject(slug);
        }

        options.slug = slug;

        if ( settings ) {
            options.settings = serialize(settings);
        }

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
                content.settings = unserialize(content.settings);

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
                    result.settings = unserialize(result.settings);

                    contents.push(result);
                });

                return contents;
            });
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

    onDeleteContent( typeId, contentId, options ) {
        let commentsDB = this.getCommentQuery(typeId);

        // Delete properties
        this.deleteContentProperty( typeId, contentId ).catch(errorHandler);

        if ( ! options.hasComments ) {
            return true;
        }

        // @todo: delete comments
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

        return db.get( sql, format )
            .then( results => {
                if ( ! results.length ) {
                    return reject(false);
                }

                return results.shift();
            });
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

        let {category, category__in} = query;
        if ( category || category__in ) {
            let cats = {
                name: 'category',
                value: category || category__in,
                compare: category ? '=' : 'IN'
            };

            if ( property ) {
                properties = [
                    {property: [property, cats]}
                ];
            } else {
                property = cats;
            }
        }

        let {tag, tag__in} = query;
        if ( tag || tag__in ) {
            let tags = {
                name: 'tag',
                value: tag || tag__in,
                compare: tag ? '=' : 'IN'
            };

            if ( property ) {
                properties = [{property: [property, tags]}];
            } else {
                property = tags;
            }
        }

        if ( property || properties ) {
            sql += ' INNER JOIN ?? AS t2 ON t1.`ID` = t2.`contentId`';
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

    async setContentProperty( props, isSingle ) {
        let {typeId, contentId, name, value} = props,
            db = this.getPropertyQuery(typeId);

        // Check for old property
        let sql = 'SELECT * FROM ?? WHERE `contentId` = ? AND `name` = ?',
            format = [db.table, contentId, name];

        let old = await db.get( sql, format ).catch(errorHandler);

        if ( old && old.error ) {
            return reject(old);
        }

        let columns = _.pick(props, ['contentId', 'name', 'value']);
        if ( ! old ) {
            return db.insert(columns);
        }

        let found = false;

        old.map( oldProp => {
            if ( _.isEqual(value, oldProp.value) ) {
                found = oldProp;
            }
        });

        if ( found ) {
            // Don't update if there's already an existing property
            return resolve(true);
        }

        if ( isSingle ) {
            let filter = ['`contentId` = ? AND `name` = ?'];
            format = [contentId, name];

            return db.update( filter, {value: value}, format );
        }

        return db.insert(columns);
    }

    getContentProperty( typeId, ID, name ) {
        let db = this.getPropertyQuery(typeId),
            sql = 'SELECT * FROM ?? WHERE `contentId` = ? AND `name` = ?',
            format = [db.table, ID, name];

        return db.get( sql, format );
    }

    getContentProperties(typeId, ID) {
        let db = this.getPropertyQuery(typeId),
            sql = 'SELECT * FROM ?? WHERE `contentId` = ?',
            format = [db.table, ID];

        return db.get( sql, format );
    }

    deleteContentProperty( typeId, ID, name, value ) {
        let filter = ['`contentId` = ?'],
            format = [ID];

        if ( name ) {
            filter.push('AND `name` = ?');
            format.push(name);
        }

        if ( value ) {
            filter.push('AND CAST(`value` AS CHAR) = ?');
            format.push(value);
        }

        return this.getPropertyQuery(typeId).delete( filter, format );
    }

    getCategoryQuery(typeId) {
        return this.db.execQuery(`categories_${typeId}`);
    }

    async addCategory(typeId, category) {
        let {slug} = category,
            db = this.getCategoryQuery(typeId);

        if ( slug ) {
            slug = await this.filterSlug( db, slug ).catch(errorHandler);

            if ( ! slug || slug.error ) {
                return reject(slug);
            }
        }

        return db.insert(category)
            .then( results => {
                return results.insertId;
            });
    }

    async updateCategory( typeId, category ) {
        let db = this.getCategoryQuery(typeId),
            {ID, slug} = category;

        if ( slug ) {
            slug = await this.filterSlug( db, slug ).catch(errorHandler);

            if ( slug && slug.error ) {
                return reject(slug);
            }

            category.slug = slug;
        }

        let filter = ['`ID` = ?'],
            format = [ID];

        return db.update( filter, category, format );
    }

    deleteCategory( typeId, ID ) {
        let filter = ['`ID` = ?'],
            format = [ID];

        return this.getCategoryQuery(typeId).delete( filter, format );
    }

    getCategoryBy( typeId, column, value ) {
        let db = this.getCategoryQuery(typeId),
            sql = 'SELECT * FROM ?? WHERE `' + column + '` = ?',
            format = [db.table, value];

        return db.get( sql, format );
    }

    getCategories( typeId, query ) {
        let db = this.getCategoryQuery(typeId),
            sql = 'SELECT * FROM ??',
            where = [],
            condition = [],
            format = [db.table];

        let {search} = query;
        if ( search ) {
            where.push('`name` LIKE ?');
            format.push(search + '%');
        }

        let {parent, parent__in} = query;
        if ( parent ) {
            where.push('`parent` = ?');
            format.push(parent);
        } else if ( parent__in ) {
            where.push('`parent` IN (?)');
            format.push(parent__in);
        }

        let {include, exclude} = query;
        if ( include ) {
            where.push('`ID` IN (?)');
            format.push(include);
        }
        if ( exclude ) {
            where.push('`ID` NOT IN (?)');
            format.push(exclude);
        }

        if ( where.length ) {
            sql += ' WHERE ' + where.join(' AND ');
        }

        let {order, orderby} = query;
        order = order || 'ASC';
        orderby = orderby || 'name';

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

    getTagQuery(typeId) {
        return this.db.execQuery(`tags_${typeId}`);
    }

    getTagBy( typeId, column, value ) {
        let db = this.getTagQuery(typeId),
            sql = 'SELECT * FROM ?? WHERE `' + column + '` = ?',
            format = [db.table, value];

        return db.get( sql, format );
    }

    getTags( typeId, query ) {
        let db = this.getTagQuery(typeId),
            sql = 'SELECT * FROM ??',
            where = [],
            condition = [],
            format = [db.table];

        let {search} = query;
        if ( search ) {
            where.push('`name` LIKE ?');
            format.push(search + '%');
        }

        let {parent, parent__in} = query;
        if ( parent ) {
            where.push('`parent` = ?');
            format.push(parent);
        } else if ( parent__in ) {
            where.push('`parent` IN (?)');
            format.push(parent__in);
        }

        let {include, exclude} = query;
        if ( include ) {
            where.push('`ID` IN (?)');
            format.push(include);
        }
        if ( exclude ) {
            where.push('`ID` NOT IN (?)');
            format.push(exclude);
        }

        if ( where.length ) {
            sql += ' WHERE ' + where.join(' AND ');
        }

        let {order, orderby} = query;
        order = order || 'ASC';
        orderby = orderby || 'name';

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

    async addTag(typeId, category) {
        let {slug} = category,
            db = this.getTagQuery(typeId);

        if ( slug ) {
            slug = await this.filterSlug( db, slug ).catch(errorHandler);

            if ( ! slug || slug.error ) {
                return reject(slug);
            }
        }

        return db.insert(category)
            .then( results => {
                return results.insertId;
            });
    }

    async updateTag( typeId, category ) {
        let db = this.getTagQuery(typeId),
            {ID, slug} = category;

        if ( slug ) {
            slug = await this.filterSlug( db, slug ).catch(errorHandler);

            if ( slug && slug.error ) {
                return reject(slug);
            }

            category.slug = slug;
        }

        let filter = ['`ID` = ?'],
            format = [ID];

        return db.update( filter, category, format );
    }

    deleteTag( typeId, ID ) {
        let filter = ['`ID` = ?'],
            format = [ID];

        return this.getTagQuery(typeId).delete( filter, format );
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