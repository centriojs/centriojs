'use strict';

const assert = require('chai').assert;

require('../../lib/load');

const {DatabaseManager} = require('../../lib/db');

let config = {
    database: 'mongodb',
    dbName: 'mongo-test',
    secretKey: '52071d25e7ec91dd36bdd5166f01659f'
};

global.dbManager = DatabaseManager(config);

describe('Mongo content type queries', () => {
    let typeId;

    it('Should add new content type name=tester', done => {

        addContentType({
            name: 'tester',
            public: true
        })
            .then( id => {
                typeId = id;

                assert.isNumber( id, true );
                done();
            })
            .catch(done);
    });

    it('Should update the fields column', function(done) {
        this.timeout(5000);

        updateContentType({
            ID: typeId,
            fields: ['title', 'summary']
        })
            .then( ok => {
                return getContentType(typeId);
            })
            .then( content => {
                console.log(content.fields);
                assert.isObject(content, true);
                done();
            })
            .catch(done);
    });

    it('Should delete the newly inserted content type', done => {
        deleteContentType(typeId)
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should get all content types with no filter', async function() {
        this.timeout(5000);

        await addContentType({
            name: 'Test 1',
            public: true,
            slug: 'blog',
            hasCategories: true,
            hasTags: true
        }).catch(returnFalse);

        await addContentType({
            name: 'Test 2',
            slug: 'tester',
            hasCategories: true,
            hasTags: true
        }).catch(returnFalse);

        await addContentType({
            name: 'Test 3',
            public: true,
            slug: 'docs',
            hasCategories: true,
            hasTags: true
        }).catch(returnFalse);

        return getContentTypes()
            .then( results => {
                return assert.isArray( results, true );
            });
    });

    it('Should get all public types', done => {
        getContentTypes({
            public: true
        })
            .then( results => {
                let hasMatch = false;

                results.map( result => {
                    if ( ! result.public ) {
                        hasMatch = true;
                    }
                });

                assert.isFalse( hasMatch, true );
                done();
            })
            .catch(done);
    });

    it('Should delete all content types', done => {
        let contentQuery = dbManager.execQuery('content_types');
        contentQuery.delete({});

        done();
    });
});