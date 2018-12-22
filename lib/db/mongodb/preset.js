'use strict';

const _ = require('../../mixin');

class PresetQuery {
    constructor(db) {
        this.dbManager = db.execQuery('presets');
    }

    insert(columns) {
        let {name} = columns;

        return this.dbManager.query()
            .then( async ({db, collection, client}) => {
                // Check for duplicate
                let old = await collection.findOne({name: name}).catch(returnFalse);

                if ( old && old.ID ) {
                    client.close();
                    return reject( _.sprintf( il8n('Duplicate preset entry %s'), name ) );
                }

                let id = await this.dbManager.increment( 'ID', collection ).catch(returnFalse);
                if ( ! id ) {
                    client.close();

                    return reject( il8n('An unknown error occurred.') );
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

                        return err;
                    });
            });
    }

    update(preset) {
        let {ID} = preset,
            filter = {ID: ID};

        return this.dbManager.update( filter, {$set: preset} );
    }

    get(ID) {
        let filter = {ID: ID};

        return this.dbManager.get(filter)
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                return results.shift();
            });
    }

    delete(ID) {
        let filter = {ID: ID};

        return this.dbManager.delete(filter);
    }

    query(query) {
        let filter = {},
            options = {};

        let {type, type__in} = query;
        if (type) {
            filter.type = type;
        } else if ( type__in ) {
            filter.type = {$in: type__in};
        }

        let {location, location__in} = query;
        if (location) {
            filter.location = location;
        } else if ( location__in ) {
            filter.location = {$in: location__in};
        }

        let {contentType, contentType__in} = query;
        if(contentType) {
            filter.contentType = contentType;
        } else if ( contentType__in ) {
            filter.contentType = {$in: contentType__in};
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

        return this.dbManager.get( filter, options );
    }
}
module.exports = db => {
    return new PresetQuery(db);
};