'use strict';

const _ = require('underscore');

class MySQLQuery {
    constructor(dbManager, table) {
        this.dbManager = dbManager;
        this.table = table;
    }

    exec(query, options) {
        options = options || [];

        return new Promise( (res, rej) => {
            this.dbManager.connect().query( query, options, (e, r) => this.handleResponse(e, r, res, rej) );
        } );
    }

    handleResponse( err, results, res, rej) {
        if ( err ) {
            return rej(err);
        }

        res(results);
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
        let query = `DELETE FROM ?? WHERE ${filter.join(', ')}`,
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