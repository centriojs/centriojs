'use strict';

const {encrypt} = require('../../encrypt'),
    _ = require('../../mixin');

class UserQuery {
    constructor(dbManager) {
        this.dbManager = dbManager;
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

    emailExist(email) {
        return this.getUserBy( 'email', email );
    }

    __emailExist( email, collection ) {
        return new Promise( (res, rej) => {
            collection.findOne({email: email}, {limit: 1}, (err, results) => {
                if (err) {
                    rej(err);
                }

                res(results);
            });
        });
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

            // Now add new user
            return new Promise( (res, rej) => {
                collection.insertOne(userData, options, (err, results) => {
                    client.close();

                    if (err) {
                        rej(err);
                    }

                    res(results.insertedId);
                });
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
}
module.exports = dbManager => {
    return new UserQuery(dbManager);
};