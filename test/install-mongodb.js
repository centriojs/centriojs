'use strict';

const assert = require('chai').assert;

require('../lib/load');

const {DatabaseManager} = require('../lib/db');

let config = {
    database: 'mongodb',
    dbName: 'mongo-test'
};

global.dbManager = DatabaseManager(config);

describe('MongoDB: Install collections', () => {

    it('Should install `users` collection', done => {
        let schema = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['display', 'email', 'pass', 'group'],
                    properties: {
                        ID: {
                            bsonType: 'int'
                        },
                        display: {
                            bsonType: 'string',
                            maximum: 30
                        },
                        email: {
                            bsonType: 'string',
                            maximum: 50
                        },
                        pass: {
                            bsonType: 'string',
                            maximum: 100
                        },
                        group: {
                            bsonType: 'string',
                            maximum: 50
                        },
                        dateRegistered: {
                            bsonType: 'date'
                        }
                    }
                }
            }
        };

        let userQuery = dbManager.execQuery('users');

        userQuery.then( query => {
            return query.db.createCollection( query.table, schema, err => {
                if ( err ) {
                    console.log(err);
                }

                query.close();

                done();
            } );
        })
            .catch(done);
    });
});