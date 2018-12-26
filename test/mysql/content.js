'use strict';

const assert = require('chai').assert;

require('../../lib/load');

const {DatabaseManager} = require('../../lib/db');

let config = {
    database: 'mysql',
    dbName: 'centriojs_test',
    dbUser: 'root',
    dbPass: 'root',
    secretKey: '52071d25e7ec91dd36bdd5166f01659f'
};

global.dbManager = DatabaseManager(config);

describe( 'MySQL content type and content queries', () => {
    let typeId;

    it('Should add new content type name=tester', function(done) {
        this.timeout(5000);

        addContentType({
            name: 'tester',
            public: true,
            hasComments: true,
            hasCategories: true,
            hasTags: true
        })
            .then( id => {
                typeId = id;

                assert.isNumber( id, true );
                done();
            })
            .catch(done);
    });

    // Insert content here
    let contentId;
    it('Should add content with status publish', done => {
        addContent({
            typeId: typeId,
            title: 'Hello Content',
            author: 1,
            status: 'public',
            category: [7, 11, 1]
        })
            .then( id => {
                contentId = id;
                assert.isNumber( id, true );
                done();
            })
            .catch(done);
    });

    it('Try', done => {
        let q = contentTypeQuery().getContentQuery(typeId);

        q.query('SELECT JSON_EXTRACT(`category`) as cat FROM `' + q.table + '`')
            .then( results => {
                console.log(results);

                done();
            })
            .catch(done);
    });

    it('Should get content by ID', done => {
        getContent( typeId, contentId )
            .then( c => {
                assert.equal( contentId, c.ID );
                done();
            })
            .catch(done);
    });

    it('Should get content by slug', done => {
        getContentBy( typeId, 'slug', 'hello-content' )
            .then( c => {
                assert.equal( contentId, c.ID );
                done();
            })
            .catch(done);
    });

    it('Should update content title', done => {
        updateContent({
            typeId: typeId,
            ID: contentId,
            title: 'Test Content Title'
        })
            .then( id => {
                return getContent( typeId, id )
            })
            .then( c => {
                assert.equal( c.title, 'Test Content Title' );
                done();
            })
            .catch(done);
    });

    it('Should delete content by ID', done => {
        deleteContent( typeId, contentId )
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should get contents of the same category', async function() {
        this.timeout(5000);

        await addContent({
            typeId: typeId,
            title: 'Hello Content',
            author: 1,
            status: 'public',
            category: [1, 2, 5]
        }).catch(returnFalse);

        await addContent({
            typeId: typeId,
            title: 'Hello Content',
            author: 1,
            status: 'public',
            category: [5]
        }).catch(returnFalse);

        return getContents({
            typeId: typeId,
            category: 5
        })
            .then( contents => {
                console.log(contents);

                return true;
            });
    });

    it('Should get the inserted content', done => {
        getContentBy( typeId, 'ID', contentId )
            .then( content => {
                //console.log(content);

                done();
            })
            .catch(done);
    });

    it('Should update the fields column', done => {
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

    let ids = [];

    it('Should get all content types with no filter', async function() {
        this.timeout(5000);

        await addContentType({
            name: 'Test 1',
            public: true,
            slug: 'blog',
            hasCategories: true,
            hasTags: true
        })
            .then( id => {
                ids.push(id);

                return id;
            })
            .catch(returnFalse);

        await addContentType({
            name: 'Test 2',
            slug: 'tester',
            hasCategories: true,
            hasTags: true
        })
            .then( id => {
                ids.push(id);

                return id;
            })
            .catch(returnFalse);

        await addContentType({
            name: 'Test 3',
            public: true,
            slug: 'docs',
            hasCategories: true,
            hasTags: true
        })
            .then( id => {
                ids.push(id);

                return id;
            })
            .catch(returnFalse);

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

    it('Should delete all content types', async function() {
        this.timeout(5000);

        for ( let i = 0; i < ids.length; i++ ) {
            let id = ids[i];

            await deleteContentType(id).catch(errorHandler);
        }

        return true;
    });

    it('Should close database connection', done => {
        dbManager.close();
        done();
    });
});