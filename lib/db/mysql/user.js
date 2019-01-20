'use strict';

const _ = require('../../mixin');

class UserQuery {
    constructor(db) {
        this.dbManager = db.execQuery('users');
        this.settingManager = db.execQuery('user_settings');
        this.groupManager = db.execQuery('user_group');
        this.dbActivity = db.execQuery('user_activity');
    }

    query( sql, options ) {
        return this.dbManager.query( sql, options );
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

        // Set date in UTC format
        userData.dateRegistered = new Date(new Date().toUTCString());

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

        let {search} = filter;
        if ( search ) {
            search = '%' + search + '%';

            where.push('(`display` LIKE ? OR `email` LIKE ?)');
            format.push( search, search );
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

    getSettings(userId) {
        let sql = 'SELECT * FROM ?? WHERE `userId` = ?',
            format = [this.settingManager.table, userId];

        return this.settingManager.get( sql, format );
    }

    getSetting( userId, name ) {
        let sql = 'SELECT `value` FROM ?? WHERE `userId` = ? AND `name` = ?',
            format = [this.settingManager.table, userId, name];

        return this.settingManager.get( sql, format )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                let result = results.shift();

                return unserialize(result.value);
            });
    }

    async setSetting( userId, name, value ) {
        let oldSetting = await this.getSetting( userId, name ).catch(returnFalse);

        value = serialize(value);

        if ( oldSetting ) {
            // Do an update
            let filter = ['`userId` = ? AND `name` = ?'];

            return this.settingManager.update( filter, {value: value}, [userId, name] );
        }

        let column = {userId: userId, name: name, value: value};

        return this.settingManager.insert(column);
    }

    deleteSetting( userId, name ) {
        let filter = ['`userId` = ?'],
            format = [userId];

        if ( name ) {
            filter.push('`name` = ?');
            format.push(name);
        }

        return this.settingManager.delete( filter, format );
    }

    deleteSettings(userId) {
        let filter = ['`userId` = ?'],
            format = [userId];

        return this.settingManager.delete( filter, format );
    }

    addGroup(group) {
        let {caps} = group;

        if ( caps ) {
            group.caps = serialize(caps);
        }

        return this.groupManager.insert(group)
            .then( results => {
                return results.insertId;
            });
    }

    updateGroup(group) {
        let {ID, caps} = group,
            filter = ['`ID` = ?'],
            format = [ID];

        if ( caps ) {
            group.caps = serialize(caps);
        }

        return this.groupManager.update( filter, format );
    }

    deleteGroup(groupId) {
        let filter = ['`ID` = ?'],
            format = [groupId];

        return this.groupManager.delete( filter, format );
    }

    getGroup(groupId) {
        let sql = 'SELECT * FROM ?? WHERE `ID` = ?',
            filter = [this.groupManager.table, groupId];

        return this.groupManager.get( sql, filter )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                let result = results.shift();
                result.caps = unserialize(result.caps);

                return result;
            });
    }

    getGroups(query) {
        let sql = 'SELECT * FROM ??',
            format = [this.groupManager.table],
            where = [],
            condition = [];

        let {search} = query;
        if ( search ) {
            where.push('`name` LIKE ?');
            format.push(search);
        }

        if ( where.length ) {
            sql += ' WHERE ' + where.join(' AND ');
        }

        let {orderby, order} = query;
        order = order || 'ASC';
        orderby = orderby || 'name';
        condition.push(`ORDER BY ${orderby} ${order}`);

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;
            condition.push(`LIMIT ${offset}, ${perPage}`);
        }

        sql += ' ' + condition.join(', ');

        return this.groupManager.get( sql, format )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                let groups = [];

                results.map( group => {
                    group.caps = unserialize(group.caps);

                    groups.push(group);
                });

                return groups;
            })
    }

    setActivity( userId, activity, type, status ) {
        status = status || 'admin';

        let columns = {
            userId: userId,
            date: _.dbDateFormat(),
            activity: activity,
            type: type,
            status: status
        };

        return this.dbActivity.insert(columns)
            .then( results => {
                return results.insertId;
            });
    }

    deleteActivity( userId, column, value ) {
        let filter = ['`userId` = ?'],
            format = [userId];

        if ( column ) {
            filter.push('`' + column + '` = ?');
            format.push(value);
        }

        return this.dbActivity.delete( filter, format );
    }

    getActivity( userId, query ) {
        query.user = userId;

        return this.getActivities(query);
    }

    getActivities(query) {
        let sql = 'SELECT * FROM ??',
            where = [],
            condition = [],
            format = [this.dbActivity.table];

        let {user, user__in, status, status__in, type, type__in} = query;
        if ( user ) {
            where.push('`userId` = ?');
            format.push(user);
        } else if ( user__in ) {
            where.push('`userId` IN (?)');
            format.push(user__in);
        }

        if ( type ) {
            where.push('`type` = ?');
            format.push(type);
        } else if ( type__in ) {
            where.push('`type` IN (?)');
            format.push(type__in);
        }

        if ( status ) {
            where.push('`status` = ?');
            format.push(status);
        } else if ( status__in ) {
            where.push('`status` IN (?)');
            format.push(status__in);
        }

        let {dateFrom, dateTo} = query;
        dateTo = dateTo || _.dbDateFormat();

        if ( dateFrom ) {
            where.push('`date` BETWEEN ?, ?');
            format.push(dateFrom, dateTo);
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

        return this.dbActivity.get( sql, format );
    }
}
module.exports = dbManager => {
    return new UserQuery(dbManager);
};