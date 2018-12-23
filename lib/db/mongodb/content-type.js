'use strict';

class ContentTypeQuery {
    constructor(db) {
        this.dbManager = db.execQuery('content_types');
    }

    insert(options) {
        let {name, slug} = options;

        return this.dbManager.query()
            .then( async ({db, collection, client}) => {
                let old = await collection.findOne({$or: {name: name, slug: slug}}).catch(returnFalse);

                if ( old && old.ID ) {
                    client.close();

                    return reject( il8n('Duplicate content type.') );
                }

                let id = await this.dbManager.increment( 'ID', collection ).catch(returnFalse);
                if ( ! id ) {
                    client.close();

                    return reject( il8n('An unexpected error occurred.') );
                }

                options.ID = id;
                options._id = id;

                return collection.insertOne(options)
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

    update(options) {
        let filter = {ID: options.ID};

        return this.dbManager.update( filter, {$set: options} );
    }

    get(ID) {
        let filter = {ID: ID};

        return this.dbManager.get( filter )
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

    getContentTypes(query) {
        let filter = {},
            options = {};

        let {status} = query;
        if ( status ) {
            filter.status = status;
        }

        if ( query.public ) {
            filter.public = true;
        }

        let {hasCategories, hasTags, hasArchive} = query;
        if ( hasCategories ) {
            filter.hasCategories = true;
        }

        if ( hasTags ) {
            filter.hasTags = true;
        }

        if ( hasArchive ) {
            filter.hasArchive = true;
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
    return new ContentTypeQuery(db);
};