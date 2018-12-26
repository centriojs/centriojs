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
                            client.close();
                            rej(err);
                        }

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
                            client.close();
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

    it('Should install settings collection', done => {
        let schema = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name'],
                    properties: {
                        name: {
                            bsonType: 'string',
                            maximum: 60
                        },
                        value: {
                            bsonType: 'string'
                        }
                    }
                }
            }
        };

        let settingQuery = dbManager.execQuery('settings');

        settingQuery.query()
            .then( ({db, collection, client}) => {
                return db.createCollection( settingQuery.table, schema )
                    .then( ok => {
                        return collection.createIndex({name: 1});
                    })
                    .then( ok => {
                        client.close();

                        return ok;
                    })
                    .catch( err => {
                        client.close();

                        return err;
                    });
            })
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should install preset collection', done => {
        let schema = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name', 'type', 'location'],
                    properties: {
                        name: {
                            bsonType: 'string',
                            maximum: 60
                        },
                        type: {
                            bsonType: 'enum',
                            enum: ['template', 'module', 'menu'],
                            default: 'template'
                        },
                        location: {
                            bsonType: 'string',
                            maximum: 100
                        },
                        contentType: {
                            bsonType: 'string',
                            maximum: 60
                        },
                        properties: {
                            bsonType: 'object'
                        },
                        modules: {
                            bsonType: 'object'
                        },
                        menu: {
                            bsonType: 'object'
                        }
                    }
                }
            }
        };

        let presetQuery = dbManager.execQuery('presets');

        presetQuery.query()
            .then( ({db, collection, client}) => {
                return db.createCollection( presetQuery.table, schema )
                    .then( ok => {
                        return collection.createIndex({
                            name: 1,
                            type: 1,
                            location: 1,
                            contentType: 1
                        })
                            .then( ok => {
                                client.close();

                                done();
                            });
                    })
                    .catch( err => {
                        client.close();
                        done();
                    });
            });
    });

    it('Should install content_types collection', done => {
        let schema = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name', 'status', 'fields'],
                    properties: {
                        ID: {
                            bsonType: 'int'
                        },
                        name: {
                            bsonType: 'string',
                            maximum: 60
                        },
                        description: {
                            bsonType: 'string',
                            maximum: 255
                        },
                        status: {
                            bsonType: 'enum',
                            enum: ['active', 'inactive'],
                            default: 'active'
                        },
                        public: {
                            bsonType: 'bool'
                        },
                        hasCategories: {
                            bsonType: 'bool'
                        },
                        hasTags: {
                            bsonType: 'bool'
                        },
                        hasArchive: {
                            bsonType: 'bool'
                        },
                        archiveTemplate: {
                            bsonType: 'int'
                        },
                        categoryTemplate: {
                            bsonType: 'int'
                        },
                        tagTemplate: {
                            bsonType: 'int'
                        },
                        slug: {
                            bsonType: 'string'
                        },
                        fields: {
                            bsonType: 'array'
                        }
                    }
                }
            }
        };

        let typeQuery = dbManager.execQuery('content_types');

        typeQuery.query()
            .then( ({db, collection, client}) => {
                return db.createCollection( typeQuery.table, schema )
                    .then( () => {
                        return collection.createIndex({
                            name: 1,
                            slug: 1,
                            public: 1
                        })
                            .then( ok => {
                                client.close();

                                return ok;
                            });
                    })
                    .catch( err => {
                        client.close();
                        return err;
                    })
            })
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });
});