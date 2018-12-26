'use strict';

const _ = require('../../mixin');

class ContentTypeQuery {
    constructor(db) {
        this.dbManager = db.execQuery('content_types');
    }

    filterSlug( slug, collection ) {
        let $regex = new RegExp( '^' + slug + '*', 'i' );

        return collection.find({slug: {$regex: $regex}}).toArray()
            .then( results => {
                if ( ! results.length ) {
                    return slug;
                }

                let max = 1;

                results.map( result => {
                    let num = result.slug.lastIndexOf("-");

                    if ( num > 0 ) {
                        num = result.slug.substr(num + 1);

                        num = parseInt(num);

                        if ( _.isNaN(num) ) {
                            return;
                        }

                        if ( num > max ) {
                            max = num;
                        }
                    }
                });

                max += 1;

                return slug + '-' + max;
            });
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

                slug = await this.filterSlug( slug, collection ).catch(errorHandler);
                if ( ! slug || slug.error ) {
                    client.close();

                    return reject(slug);
                }

                options.slug = slug;

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

        if ( ! options.slug ) {
            return this.dbManager.update( filter, {$set: options} );
        }

        return this.dbManager.query()
            .then( async ({db, collection, client}) => {
                let slug = {collection};

                slug = await this.filterSlug( slug, collection ).catch(errorHandler);

                if ( ! slug || slug.error ) {
                    client.close();

                    return reject(slug);
                }

                options.slug = slug;

                return collection.updateOne(options)
                    .then( results => {
                        client.close();

                        return results;
                    })
                    .catch( err => {
                        client.close();

                        return err;
                    });
            });
    }

    getTypeBy( column, value ) {
        let filter = {};

        filter[column] = value;

        return this.dbManager.get( filter )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                return results.shift();
            });
    }

    get(ID) {
        return this.getTypeBy( 'ID', ID );
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