'use strict';

const _ = require('../../mixin');

class UserQuery {
    constructor(db) {
        this.dbManager = db.execQuery('users');
        this.settingManager = db.execQuery('user_settings');
        this.groupManager = db.execQuery('user_group');
        this.dbActivity = db.execQuery('user_activity');
    }

    query() {
        return this.dbManager.query();
    }

    getUserBy( column, value ) {
        let filter = {},
            options = {limit: 1};

        filter[column] = value;

        return this.dbManager.get( filter, options )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                let user = results.shift();

                return user;
            });
    }


    __emailExist( email, collection ) {
        return collection.findOne({email: email}, {limit: 1});
    }

    addUser(userData) {
        let {email} = userData;

        const newUser = async ({db, collection, client}) => {
            // Check if email already exist
            let exist = await this.__emailExist( email, collection ).catch(errorHandler);
            if ( exist && exist.ID ) {
                client.close();

                return reject( il8n('Email already exist.') );
            }

            // Get incremented id
            let ID = await this.dbManager.increment( 'ID', collection ).catch(errorHandler);
            if ( ! ID || ID.error ) {
                client.close();

                return reject( il8n('An unexpected error occurred.') );
            }

            userData.ID = ID;
            userData._id = ID;
            userData.dateRegistered = new Date();

            let options = {
                $currentDate: {dateRegistered: 'timestamp'}
            };

            return collection.insertOne(userData, options)
                .then( results => {
                    client.close();

                    return results.insertedId;
                })
                .catch( err => {
                    client.close();

                    return err;
                });
        };

        return this.dbManager.query().then(newUser);
    }

    updateUserData(userData) {
        let {ID} = userData,
            filter = {
                ID: ID
            },
            options = {$set: userData};

        return this.dbManager.update( filter, options );
    }

    deleteUser(ID) {
        let filter = {ID: ID};

        return this.dbManager.delete(filter);
    }

    getUsers(query) {
        let filter = {},
            options = {};


        let {group, group__in} = query;
        if ( group ) {
            filter.group = group;
        } else if ( group__in ) {
            filter.group = {$in: group__in};
        }

        let {fields} = query,
            isIds = false;

        if ( fields ) {
            if ( _.isArray(fields) ) {
                options.projection = _.toObject(fields);
            } else if ( 'ids' === fields.toLowerCase() ) {
                isIds = true;
                options.projection = {ID: 1};
            } else {
                // Assume single column name
                let proj = {};
                proj[fields] = 1;
                options.projection = proj;
            }
        }

        let {orderby, order} = query;
        order = order || 'ASC';
        order = 'asc' === order.toLowerCase() ? 1 : -1;

        if ( orderby ) {
            let sorter = {};
            sorter[orderby] = order;
            options.sort = sorter;
        }

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;

            if ( offset > 0 ) {
                options.skip = offset;
            }
            options.limit = perPage;
        }

        return this.dbManager.get( filter, options )
            .then( users => {
                if ( isIds ) {
                    let _users = _.pluck( users, 'ID' );

                    return _users;
                }

                return users;
            });
    }

    getSettings(userId) {
        let filter = {userId: userId};

        return this.settingManager.get(filter);
    }

    setSetting( userId, name, value ) {
        let upsert = async ({db, collection, client}) => {
            let filter = {userId: userId, name: name};

            let oldValue = await collection.findOne(filter).catch(errorHandler);
            if ( oldValue && oldValue.error ) {
                client.close();

                return reject( il8n('Unexpected error occurred.') );
            }

            if ( oldValue && oldValue.value ) {
                return collection.updateOne(filter, {$set: {value: value}})
                    .then( results => {
                        client.close();

                        return results;
                    })
                    .catch( err => {
                        client.close();

                        return err;
                    });
            }

            filter.value = value;

            return collection.insertOne(filter)
                .then( results => {
                    client.close();

                    return results.insertedCount;
                })
                .catch( err => {
                    client.close();

                    return err;
                });
        };

        return this.settingManager.query().then(upsert);
    }

    deleteSetting( userId, name ) {
        let filter = {userId: userId};

        if ( name ) {
            filter.name = name;
        }

        return this.settingManager.delete(filter);
    }

    addGroup(group) {
        let groupDB = this.groupManager;

        return groupDB.query()
            .then( async ({db, collection, client}) => {
                let id = await groupDB.increment( 'ID', collection ).catch(errorHandler);

                if ( ! id || id.error ) {
                    client.close();

                    return reject(il8n('Cannot increment group ID.'));
                }

                group.ID = id;
                group._id = id;

                return collection.insertOne(group)
                    .then( results => {
                        client.close();

                        return results.insertedId;
                    })
                    .catch( err => {
                        client.close();

                        return err;
                    });
            });
    }

    updateGroup(group) {
        let {ID} = group,
            filter = {ID: ID};

        return this.groupManager.update( filter, {$set: group} );
    }

    deleteGroup(groupId) {
        let filter = {
            ID: groupId
        };

        return this.groupManager.delete(filter);
    }

    getGroups(query) {
        let filter = {},
            options = {};

        let {orderby, order} = query;
        order = order || 'ASC';
        order = 'asc' === order.toLowerCase() ? 1 : -1;
        orderby = orderby || 'name';

        let sorter = {};
        sorter[orderby] = order;
        options.sort = sorter;

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;

            if ( offset > 0 ) {
                options.skip = offset;
            }
            options.limit = perPage;
        }

        return this.groupManager.get( filter, options );
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

        return this.dbActivity.query()
            .then( async ({db, collection, client}) => {
                let id = await this.dbActivity.increment( 'ID', collection ).catch(errorHandler);

                if ( ! id || id.error ) {
                    client.close();

                    return reject(il8n('Cannot increment activity ID.'));
                }

                columns.ID = id;
                columns._id = id;

                return collection.insertOne(columns)
                    .then( results => {
                        client.close();

                        return results.insertedId;
                    })
                    .catch( err => {
                        client.close();

                        return reject(err);
                    });
            });
    }

    deleteActivity(userId, column, value) {
        let filter = {userId: userId};

        if ( column ) {
            filter[column] = value;
        }

        return this.dbActivity.delete(filter);
    }

    getActivity( userId, query ) {
        query.user = userId;

        return this.getActivities(query);
    }

    getActivities(query) {
        let filter = {},
            options = {};

        let {user, user__in, status, status__in, type, type__in} = query;
        if ( user ) {
            filter.user = user;
        } else if ( user__in ) {
            filter.user = {$in: user__in};
        }

        if ( status ) {
            filter.status = status;
        } else if ( status__in ) {
            filter.status = {$in: status__in};
        }

        if ( type ) {
            filter.type = type;
        } else if ( type__in ) {
            filter.type = {$in: type__in};
        }

        let {dateFrom, dateTo} = query;
        dateTo = dateTo || _.dbDateFormat();

        if ( dateFrom ) {
            filter.$and = {
                $gte: {date: dateFrom},
                $lte: {date: dateTo}
            };
        }

        options.sort = {date: -1};

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;

            if ( offset > 0 ) {
                options.skip = offset;
            }
            options.limit = perPage;
        }

        return this.dbActivity.get( filter, options );
    }
}
module.exports = dbManager => {
    return new UserQuery(dbManager);
};