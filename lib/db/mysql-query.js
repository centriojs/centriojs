'use strict';

const _ = require('underscore');

class MySQLQuery {
    constructor(dbManager, table) {
        this.dbManager = dbManager;
        this.table = table;
    }

    createTable(columns) {
        let engine = 'InnoDB',
            charset = 'DEFAULT';

        let sql = 'CREATE TABLE IF NOT EXISTS `' + this.table + '` (' + columns.join(', ') + ')' +
            `engine=${engine} charset=${charset}`;

        return this.exec(sql);
    }

    getTableStructure() {
        let sql = 'DESCRIBE ??',
            format = [this.table];

        return this.exec( sql, format )
            .then( results => {
                let structure = {};

                results.map( result => {
                    let type = result.Type;

                    if ( type.match(/\(/) ) {
                        type = type.substr(0, type.indexOf("("));
                    }

                    let columns = {
                        type: type,
                        default: result.Default
                    };

                    structure[result.Field] = columns;
                });

                return structure;
            });
    }

    dropTable() {
        let sql = `DROP TABLE ${this.table}`;

        return this.getTableStructure()
            .then( () => {
                return this.exec(sql);
            });
    }

    exec(query, options) {
        options = options || [];

        return this.dbManager.connect()
            .then( conn => {
                return new Promise( (res, rej) => {
                    conn.query( query, options, (err, results) => {
                        conn.end();

                        if ( err ) {
                            rej(err);
                        }

                        res(results);
                    });
                });
            });
    }

    get(query, options) {
        return this.exec(query, options);
    }

    insert(columns) {
        let query = `INSERT INTO ?? SET ?`,
            format = [this.table, columns];

        return this.exec( query, format );
    }

    /**
     * Update columns base on the given an array of where clause filter.
     *
     * @param {array} filter        An array of where clauses. (i.e. `column` = ?)
     * @param {object} columns      The column/value table field to update.
     * @param {array} options       An array of value used in where clause filter.
     */
    update(filter, columns, options) {
        filter = filter || [];

        let query = `UPDATE ?? SET ? WHERE ` + filter.join(', '),
            format = [this.table, columns];

        if ( options ) {
            format = format.concat(options);
        }

        return this.exec(query, format);
    }

    /**
     * Delete data from the database.
     *
     * @param {string}  filter          Required. An array of where clause [`ID` = ?] format.
     * @param {array} options           An array of values set in the filter where clause.
     */
    delete(filter, options) {
        let query = `DELETE FROM ?? WHERE ${filter.join(' ')}`,
            format = [this.table];

        if ( options ) {
            format = format.concat(options);
        }

        return this.exec( query, format );
    }

    query( query, options ) {
        return this.exec( query, options );
    }
}
module.exports = MySQLQuery;