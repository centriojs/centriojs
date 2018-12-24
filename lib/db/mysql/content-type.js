'use strict';

const _ = require('../../mixin');

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
            columns.push('`template` BIGINT(20) DEFAULT 0');
        }

        if ( options.hierarchical ) {
            columns.push('`parent` BIGINT(20) DEFAULT 0');
        }

        if ( options.hasCategories ) {
            columns.push('`category` VARCHAR(255)');
        }

        if ( options.hasTags ) {
            columns.push('`tags` VARCHAR(255)');
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

        let settingQuery = this.getSettingQuery(typeId);
        let settings = [
            '`contentId` BIGINT(20) UNSIGNED NOT NULL PRIMARY KEY',
            '`name` VARCHAR(160) NOT NULL',
            '`value` LONGTEXT',
            'Index (`contentId`, `name`)'
        ];

        let settingDone = await settingQuery.createTable(settings);
        if ( ! settingDone || settingDone.error ) {
            return reject(settingDone);
        }

        if ( ! options.hasComments ) {
            return resolve(true);
        }

        let commentsQuery = this.getCommentQuery(typeId);

        let commentsColumns = [
            '`ID` BIGINT(20) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT',
            '`contentId` BIGINT(20) UNSIGNED NOT NULL',
            '`authorId` BIGINT(20) DEFAULT 0',
            '`author` VARCHAR(100)',
            '`authorEmail` VARCHAR(100)',
            '`authorUrl` VARCHAR(160)',
            '`comment` LONGTEXT',
            '`status` ENUM ("publish", "pending", "spam")',
            'Index (`ID`, `contentId`, `authorId`, `status`)'
        ];

        let doneComments = await commentsQuery.createTable(commentsColumns).catch(errorHandler);
        if ( ! doneComments || doneComments.error ) {
            return reject(doneComments);
        }

        return resolve(true);
    }

    async updateContentTable( typeId, options ) {
        let db = this.getContentQuery(typeId),
            fields = unserialize(options.fields),
            structure = db.getTableStructure();

        let columns = [],
            fieldObj = _.toObject(fields);

        if ( options.public && ! fieldObj.template ) {
            columns.push('ADD `template` BIGINT(20) DEFAULT 0');
        }

        if ( options.hierarchical && ! fieldObj.parent ) {
            columns.push('ADD `parent` BIGINT(20) DEFAULT 0');
        }

        if ( options.hasCategories && ! fieldObj.category ) {
            columns.push('ADD `category` VARCHAR(255)');
        }

        if ( options.hasTags && ! fieldObj.tags ) {
            columns.push('ADD `tags` VARCHAR(255)');
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

        let allowed = ['ID', 'parent', 'status', 'template', 'category', 'tags'];

        _.keys(structure).map( column => {
            if ( fieldObj[column] || _.contains( allowed, column ) ) {
                return;
            }

            columns.push('DROP `' + column + '`');
        });

        let done = await db.exec('ALTER TABLE `' + db.table + '` ' + columns.join(', ')).catch(errorHandler);
        if ( ! done || done.error ) {
            return false;
        }

        if ( ! options.hasComments ) {
            await this.getCommentQuery(typeId).dropTable().catch(errorHandler);
        }

        return true;
    }

    async dropContentTables( typeId, content ) {
        // Drop content table
        await this.getContentQuery(typeId).dropTable().catch(errorHandler);

        // Drop settings table
        await this.getSettingQuery(typeId).dropTable().catch(errorHandler);

        if ( ! content.hasComments ) {
            return true;
        }

        await this.getCommentQuery(typeId).dropTable().catch(errorHandler);

        return true;
    }

    insert(options) {
        options.fields = serialize(options.fields);

        return this.dbManager.insert(options)
            .then( results => {
                return results.insertId;
            });
    }

    update(options) {

        let {ID} = options,
            filter = ['`ID` = ?'],
            format = [ID];

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

        let {status} = query;
        if ( status ) {
            where.push('`status` = ?');
            format.push(status);
        } else {
            where.push('`status` IN (?)');
            format.push(['active', 'inactive']);
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
            sql += 'WHERE ' + where.join(' AND ');
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

    getContentQuery(typeId) {
        return this.db.execQuery(`content_${typeId}`);
    }

    getCommentQuery(typeId) {
        return this.db.execQuery(`comments_${typeId}`);
    }

    getSettingQuery(typeId) {
        return this.db.execQuery(`content_settings_${typeId}`);
    }

    filterSlug(typeId, slug) {
        let db = this.getContentQuery(typeId),
            sql = 'SELECT `ID`, `slug` FROM ?? WHERE `slug` LIKE ?',
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

    async insertContent( typeId, content) {
        content.created = _.dbDateFormat();
        content.updated = _.dbDateFormat();

        if ( content.slug ) {
            let slug = await this.filterSlug( typeId, content.slug ).catch(errorHandler);
            if ( ! slug || slug.error ) {
                return reject(il8n('An unexpected error occurred.') );
            }

            content.slug = slug;
        }

        return this.getContentQuery(typeId).insert(content)
            .then( results => {
                return results.insertId;
            });
    }

    async updateContent(typeId, content) {
        let {ID} = content,
            filter = ['`ID` = ?'],
            format = [ID];

        content.updated = _.dbDateFormat();

        if ( content.slug ) {
            let slug = await this.filterSlug( typeId, content.slug ).catch(errorHandler);

            if ( ! slug || slug.error ) {
                return reject( il8n('An unexpected error occurred.') )
            }

            content.slug = slug;
        }

        return this.getContentQuery(typeId).update( filter, content, format );
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

    getContents(typeId, query) {
        let db = this.getContentQuery(typeId),
            sql = 'SELECT * FROM ??',
            where = [],
            condition = [],
            format = [db.table],
            isIds = false;

        let {fields} = query;
        if ( fields ) {
            if ( _.isArray(fields) ) {
                sql = 'SELECT ? FROM ??';
            } else if ( 'ids' === fields.toLowerCase() ) {
                isIds = true;
                fields = 'ID';
            }

            format = [fields, db.table];
        }

        return db.get( sql, format );
    }
}
module.exports = db => {
    return new ContentTypeQuery(db);
};