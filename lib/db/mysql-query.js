'use strict';

const _ = require('underscore'),
    Cache = require('../cache');

class MySQLQuery {
    constructor(dbManager, table) {
        this.dbManager = dbManager;
        this.table = table;

        this.mode = false;
        this.sql = '';
        this.format = [];
        this.whereClause = [];
        this.orderByClause = [];
        this.groupByClause = '';
        this.limitClause = '';

        // Prefetch column structure
        // @todo: Find a better alternative to get the table's column structure
        this.getColumnsStructure();
    }

    getTableName() {
        return this.dbManager.prefix + this.table;
    }

    getColumnsStructure() {
        let cacheKey = this.getTableName() + 'Columns',
            cache = Cache.get( cacheKey );

        if ( cache ) {
            return cache;
        }

        return this.dbManager.execQuery( `DESCRIBE ??`, this.getTableName() )
            .then( results => {
                if ( ! results.length ) {
                    return reject( il8n('Table does not exist.') );
                }

                let columns = {};

                results.map( result => {
                    let type = result.Type;

                    if ( type.match(/[\(\)]/g) ) {
                        type = type.split('(')[0];
                    }

                    columns[result.Field] = {
                        type: type
                    };
                });

                Cache.set( cacheKey, columns );

                return columns;
            })
            .catch(errorHandler);
    }

    get(columns) {
        this.mode = 'get';
        this.sql = 'SELECT ?? FROM ??';
        this.format = [columns, this.getTableName()];

        return this;
    }

    insert(columns) {
        columns = this.__preFilterColumns(columns);

        this.mode = 'insert';
        this.sql = 'INSERT INTO ?? SET ?';
        this.format = [this.getTableName(), columns];

        return this;
    }

    update(columns) {
        columns = this.__preFilterColumns(columns);
        this.mode = 'update';
        this.sql = 'UPDATE ?? SET ?';
        this.format = [this.getTableName(), columns];

        return this;
    }

    delete() {
        this.mode = 'delete';
        this.sql = 'DELETE FROM ??';
        this.format = [this.getTableName()];

        return this;
    }

    where( column, operator, value ) {
        let where = '`' + column + '` ' + operator + ' ?';

        this.whereClause.push(where);
        this.format.push(value);

        return this;
    }

    andWhere( column, operator, value ) {
        if ( ! this.whereClause.length ) {
            return this.where( column, operator, value );
        }

        this.whereClause.push('AND');
        this.where( column, operator, value );

        return this;
    }

    orWhere( column, operator, value ) {
        if ( ! this.whereClause.length ) {
            return this.where( column, operator, value );
        }

        this.whereClause.push('OR');
        this.where( column, operator, value );

        return this;
    }

    orderBy( column, order ) {
        let orderBy = '`' + column + '` ' + order;
        this.orderByClause.push(orderBy);

        return this;
    }

    groupBy( column, order ) {
        this.groupBy = 'GROUP BY `' + column + '`';

        if ( order ) {
            this.groupByClause += ' ' + order;
        }

        return this;
    }

    limit( page, perPage ) {
        page = page || 1;
        perPage = perPage || 20;

        let offset = (page - 1) * perPage;

        this.limitClause = ` LIMIT ${offset}, ${perPage}`;

        return this;
    }

    __preFilterColumns(columns) {
       let structure = this.getColumnsStructure();

        Object.keys(columns).map( key => {
            if ( ! structure[key] ) {
                // Remove unwanted column
                delete columns[key];

                return false;
            }

            let value = columns[key];

            if ( _.isObject(value) || _.isArray(value) ) {
                columns[key] = serialize(columns[key]);
            }
        });

        return columns;
    }

    __postFilterColumns(columns) {
        let structure = this.getColumnsStructure();

        Object.keys(columns).map( key => {
            if ( ! structure[key] ) {
                return false;
            }

            let column = structure[key];

            if ( 'LONGTEXT' === column.type ) {
                columns[key] = unserialize(columns[key]);
            }
        });

        return columns;
    }

    exec() {
        if ( this.whereClause.length ) {
            this.sql += ' WHERE ' + this.whereClause.join(' ');
        }

        if ( this.orderByClause.length ) {
            this.sql += ' ORDER BY ' + this.orderByClause.join(',');
        }

        if ( this.groupByClause ) {
            this.sql += this.groupByClause;
        }

        if ( this.limitClause ) {
            this.sql += this.limitClause;
        }

        return this.dbManager.execQuery( this.sql, this.format )
            .then( results => {
                if ( !results.length || 'get' !== this.mode) {
                    return results;
                }

                return results.map( result => this.__postFilterColumns(result) );
            });
    }
}
module.exports = MySQLQuery;