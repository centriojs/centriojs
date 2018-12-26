'use strict';

const assert = require('chai').assert,
    _ = require('../../lib/mixin');

require('./config');

describe('MySQL: Content types', () => {
    let typeId;

    it('Should delete existing content types', done => {
        dbManager.execQuery('content_types')
            .delete({})
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should create new content type', function(done) {
        this.timeout(5000);

        addContentType({
            name: 'Docs',
            description: 'Content about docs',
            public: true,
            status: 'active',
            slug: 'docs',
            hasCategories: true,
            hasTags: true,
            hasArchive: true,
            hasPage: true,
            hasComments: true
        })
            .then( id => {
                typeId = id;
                assert.isNumber( id, true );
                done();
            })
            .catch(done);
    });

    it('Should update content type', function(done) {
        this.timeout(5000);

        updateContentType({
            ID: typeId,
            name: 'Knowledge Base'
        })
            .then( id => {
                return getContentType(id);
            })
            .then( c => {
                assert.equal( c.name, 'Knowledge Base'  );
                done();
            })
            .catch(done);
    });

    it('Should get content type by slug', function(done) {
        this.timeout(3000);

        getContentTypeBy( 'slug', 'docs' )
            .then( c => {
                assert.equal( c.ID, typeId );
                done();
            })
            .catch(done);
    });

    it('Should delete the content type.', function(done) {
        this.timeout(3000);

        deleteContentType(typeId)
            .then(ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    let ids = [];

    it('Should add multiple content types', async function() {
        this.timeout(15000);

        for( let i = 1; i < 7; i++ ) {
            let odd = i%2;
            let args = {
                name: 'Test',
               // slug: 'test-' + i,
                public: !!odd,
                status: odd ? 'active' : 'inactive',
                hasCategories: !!odd,
                hasTags: !!odd,
                hasArchive: true,
                hasPage: true,
                hasComments: true
            };

            await addContentType( args )
                .then( id => {
                    ids.push(id);

                    return id;
                }).catch(err => {
                    console.log(err);

                    return err;
                });
        }

        return true;
    });

    it('Should get all content types with no filter', function(done) {
        getContentTypes()
            .then( results => {
                assert.equal( results.length, 6 );

                done();
            })
            .catch(done);
    });

    it('Should get content types that are public', function(done) {
        this.timeout(3000);

        getContentTypes({
            public: true
        })
            .then( results => {
                assert.equal( results.length, 3 );
                done();
            })
            .catch(done);
    });

    it('Should get content types that are active', done => {
        getContentTypes({
            status: 'active'
        })
            .then( c => {
                assert.equal( c.length, 3 );
                done();
            })
            .catch(done);
    });

    it('Should get content types where categories are enabled', done => {
        getContentTypes({
            hasCategories: true
        })
            .then( c => {
                assert.equal( c.length, 3);
                done();
            })
            .catch(done);
    });

    it('Should get the first page of content types', done => {
        getContentTypes({
            perPage: 3
        })
            .then( c => {
                c = _.pluck( c, 'ID' );
                assert.isTrue( _.isEqual(c, ids.slice(0, 3)), true );
                done();
            })
            .catch(done);
    });

    it('Should get the 2nd page of content types', done => {
        getContentTypes({
            page: 2,
            perPage: 3
        })
            .then( c => {
                c = _.pluck( c, 'ID' );
                assert.isTrue( _.isEqual(c, ids.slice(3)), true );
                done();
            })
            .catch(done);
    });

    it('Should get content types where tags are enabled', done => {
        getContentTypes({
            hasTags: true
        })
            .then( c => {
                assert.equal( c.length, 3 );
                done();
            })
            .catch(done);
    });

    it('Should delete all content types', async function() {
        this.timeout(15000);

        for ( let i = 0; i < ids.length; i++ ) {
            let id = ids[i];

            await deleteContentType(id).catch(errorHandler);
        }

        return true;
    });
});