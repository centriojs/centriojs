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
        });
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

    update(filter, columns) {
        let query = `UPDATE ?? SET ? WHERE ?`,
            format = [this.table, columns, filter];

        return this.exec(query, format);
    }

    delete(filter) {
        let query = `DELETE FROM ?? WHERE ?`,
            format = [this.table, filter];

        return this.exec( query, format );
    }

    query( query, options ) {
        return this.exec( query, options );
    }
}
module.exports = MySQLQuery;