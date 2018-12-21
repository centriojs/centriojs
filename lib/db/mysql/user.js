'use strict';

const {encrypt} = require('../../encrypt'),
    _ = require('../../mixin');

class UserQuery {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }

    getUserBy( column, value ) {
        let query = 'SELECT * FROM ?? WHERE `' + column + '` = ?',
            format = [this.dbManager.table, value];

        return this.dbManager.get( query, format )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                return results.shift();
            });
    }

    emailExist(email) {
        return this.getUserBy( 'email', email );
    }

    async addUser(userData) {
        let {email} = userData;

        // Check if email already existed
        let exist = await this.emailExist(email).catch(returnFalse);
        if ( exist.ID ) {
            return reject( il8n('Email already exist.') );
        }

        return this.dbManager.insert(userData)
            .then( results => {
                return results.insertId;
            });
    }

    async updateUserData(userData) {
        let {email} = userData;

        if ( email ) {
            let exist = await this.emailExist(email).catch(returnFalse);
            if ( exist.ID && userData.ID !== exist.ID ) {
                return reject( il8n('Email already exist.') );
            }
        }

        let filter = ['`ID` = ?'],
            format = [userData.ID];

        return this.dbManager.update( filter, userData, format );
    }

    deleteUser(ID) {
        let filter = ['`ID` = ?'],
            format = [ID];

        return this.dbManager.delete( filter, format );
    }

    getUsers(filter) {
        let sql = 'SELECT ?? FROM ??',
            where = [],
            format = [],
            condition = [],
            isIds = false;

        let {fields} = filter;
        if ( fields ) {
            isIds = ! _.isArray(fields) && 'ids' === fields.toLowerCase();

            if ( isIds ) {
                format.push( 'ID', this.dbManager.table );
            } else {
                format.push( fields, this.dbManager.table );
            }
        } else {
            sql = 'SELECT * FROM ??';
            format.push(this.dbManager.table);
        }

        let {group, group__in} = filter;
        if ( group ) {
            where.push('`group` = ?');
            format.push(group);
        } else if ( group__in ) {
            where.push('`group` IN (?)');
            format.push(group__in);
        }

        if ( where.length ) {
            sql += ' WHERE ' + where.join(', ');
        }

        let {orderby, order} = filter;
        order = order || 'ASC';

        if ( orderby ) {
            condition.push(`ORDER BY ${orderby} ${order}`);
        }

        let {page, perPage} = filter;
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
                    return [];
                }

                if ( isIds ) {
                    // Only return an array of ids
                    let ids = _.pluck( results, 'ID' );

                    return ids;
                }

                return results;
            });
    }
}
module.exports = dbManager => {
    return new UserQuery(dbManager);
};