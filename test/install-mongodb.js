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

    it('Should install `users` collection', function(done) {
        this.timeout(3000);

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

        userQuery.query()
            .then( ({db, collection, client}) => {
                return new Promise( (res, rej) => {
                    db.createCollection( userQuery.table, schema, err => {
                        if ( err ) {
                            rej(err);
                        }

                        //client.close();
                        //res(true);

                        collection.createIndex({
                            ID: 1,
                            display: 1,
                            email: 1
                        }, err => {
                            client.close();

                            if ( err ) {
                                rej(err);
                            }

                            res(true);
                        });
                    });
                });
            })
            .then( ok => {
                done();
            })
            .catch(done);
    });

    it('Should install user_settings collection', done => {
        let schema = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['userId', 'name'],
                    properties: {
                        userId: {
                            bsonType: 'int'
                        },
                        name: {
                            bsonType: 'string',
                            maximum: 50
                        },
                        value: {
                            bsonType: 'string'
                        }
                    }
                }
            }
        };

        let settingQuery = dbManager.execQuery('user_settings');

        settingQuery.query()
            .then( ({db, collection, client}) => {
                return new Promise( (res, rej) => {
                    db.createCollection( settingQuery.table, schema, err => {
                        if ( err ) {
                            rej(err);
                        }

                        collection.createIndex({
                            userId: 1,
                            name: 1
                        }, err => {
                            client.close();

                            if (err) {
                                rej(err);
                            }

                            res(true);
                        });
                    } );
                });
            })
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });
});