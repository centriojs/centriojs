'use strict';

const _ = require('../mixin');

class MongoQuery {
    constructor(db, client, tableName) {
        this.db = db;
        this.client = client;
        this.table = tableName;
        this.collection = this.db.collection( tableName );
    }

    close() {
        this.client.close();
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
            this.collection.find( query, options, (e, r) => this.handleResponse(e, r, res, rej) );
        })
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
            if ( isSingle ) {
                this.collection.insertOne(docs, options, (e, r) => this.handleResponse(e, r, res, rej) );
            } else {
                this.collection.insertMany(docs, options, (e, r) => this.handleResponse(e, r, res, rej) );
            }
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
            if ( isSingle ) {
                this.collection.updateOne( filter, docs, options, (e, r) => this.handleResponse(e, r, res, rej) );
            } else {
                this.collection.updateMany( filter, docs, options, (e, r) => this.handleResponse(e, r, res, rej) );
            }
        })
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
            this.collection.deleteMany( filter, options, (e, r) => this.handleResponse(e, r, res, rej) );
        });
    }

    handleResponse( err, results, res, rej ) {
        this.close();

        if ( err ) {
            return rej(err);
        }

        res(results);
    }

    query() {
        return this.collection;
    }
}
module.exports = MongoQuery;