'use strict';

class ContentTypeQuery {
    constructor(db) {
        this.dbManager = db.execQuery('content_types');
    }

    insert(options) {
        options.fields = serialize(options.fields);

        return this.dbManager.insert(options)
            .then( results => {
                return results.insertId;
            });
    }

    update(options) {
        if ( options.fields ) {
            options.fields = serialize(options.fields);
        }

        let {ID} = options,
            filter = ['`ID` = ?'],
            format = [ID];

        return this.dbManager.update( filter, options, format );
    }

    get(ID) {
        let sql = 'SELECT * FROM ?? WHERE `ID` = ?',
            format = [this.dbManager.table, ID];

        return this.dbManager.get( sql, format )
            .then( results => {
                if ( ! results.length ) {
                    return results;
                }

                let content = results.shift();

                content.fields = unserialize(content.fields);

                return content;
            });
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
}
module.exports = db => {
    return new ContentTypeQuery(db);
};