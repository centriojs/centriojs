'use strict';

const _ = require('../mixin');

class MongoQuery {
    constructor( dbManager, tableName ) {
        this.dbManager = dbManager;
        this.table = tableName;
        this.type = 'mongodb';
    }

    close() {
        //this.client.close();
    }

    query() {
        return new Promise( (res, rej) => {
            this.dbManager.connect().connect( (err, client) => {
                if(err) {
                    rej(err);
                }

                let db = client.db(this.dbManager.config.dbName),
                    collection = db.collection(this.table);

                res({
                    db: db,
                    collection: collection,
                    client: client
                });
            });
        });
    }

    increment(column) {
        return this.query()
            .then( ({db, collection, client}) => {
                let sorter = {},
                    proj = {};

                sorter[column] = -1;
                proj[column] = 1;

                return new Promise( res => {
                    collection.find( {}, {
                        sort: sorter,
                        projection: proj,
                        limit: 1
                    })
                        .toArray( (err, results) => {
                            client.close();

                            if ( err || ! results || ! results.length ) {
                               return res(1);
                            }

                               let result = results.shift(),
                                   max = result[column];

                               res(max+1);
                        });
                } );
            } )
            .catch( () => {
                return 1;
            });
    }

    /**
     * Get documents base on the given query object.
     *
     * @param {object} query
     * @param {object} options
     * @returns {Promise<any>}
     */
    get(query, options) {
        options = options || {};

        return new Promise( (res, rej) => {
            this.dbManager.connect().connect( (err, client) => {
                if ( err ) {
                    res(err);
                }

                let db = client.db(this.dbManager.config.dbName),
                    collection = db.collection(this.table);

                collection.find( query, options ).toArray((e, r) => this.handleResponse(e, r, client, res, rej) );
            });
        });
    }

    /**
     * Insert a document or an array of documents to the database.
     *
     * @param {object|array} docs
     * @returns {Promise<any>}
     */
    insert(docs) {
        let options = arguments[1] || {},
            isSingle = _.isObject(docs);

        return new Promise( (res, rej) => {
            this.dbManager.connect().connect( (err, client) => {
                if ( err ) {
                    return res(err);
                }

                let db = client.db(this.dbManager.config.dbName),
                    collection = db.collection(this.table);

                if ( isSingle ) {
                    return collection.insertOne(docs, options, (e, r) => this.handleResponse(e, r, client, res, rej) );
                }

                collection.insertMany(docs, options, (e, r) => this.handleResponse(e, r, client, res, rej) );
            });
        });
    }

    /**
     * Update a document or an array of documents base on the given filter object.
     *
     * @param {object} filter
     * @param {object|array} docs
     * @returns {Promise<any>}
     */
    update(filter, docs) {
        let options = arguments[2] || {},
            isSingle = _.isObject(docs);

        return new Promise( (res, rej) => {
            this.dbManager.connect().connect( (err, client) => {
                if (err) {
                    rej(err);
                }

                let db = client.db(this.dbManager.config.dbName),
                    collection = db.collection(this.table);

                if ( isSingle ) {
                    return collection.updateOne( filter, docs, options, (e, r) => this.handleResponse(e, r, client, res, rej) );
                }

                collection.updateMany( filter, docs, options, (e, r) => this.handleResponse(e, r, client, res, rej) );
            });
        });
    }

    /**
     * Delete a document or an array of documents base on the given filter object.
     *
     * @param {object} filter
     * @returns {Promise<any>}
     */
    delete(filter) {
        let options = arguments[1] || {};

        return new Promise( (res, rej) => {
            this.dbManager.connect().connect( (err, client) => {
                if ( err ) {
                    rej(err);
                }

                let db = client.db(this.dbManager.config.dbName),
                    collection = db.collection(this.table);

                collection.deleteMany( filter, options, (e, r) => this.handleResponse(e, r, client, res, rej) );
            });
        });

        /**

        return new Promise( (res, rej) => {
            this.collection.deleteMany( filter, options, (e, r) => this.handleResponse(e, r, res, rej) );
        });
         **/
    }

    handleResponse( err, results, client, res, rej ) {
        client.close();

        if ( err ) {
            rej(err);
        }

        res(results);
    }

    exec() {

    }
}
module.exports = MongoQuery;