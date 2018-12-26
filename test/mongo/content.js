'use strict';

const assert = require('chai').assert,
    _ = require('../../lib/mixin');

require('./config');

describe('Mongo content type queries', () => {
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
    it('Should insert new content', function(done) {
        this.timeout(5000);

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

    it('Should update content title', function(done) {
        this.timeout(5000);

        updateContent({
            typeId: typeId,
            ID: contentId,
            title: 'Test Content Title',
            slug: 'test-content-title'
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

    it('Should delete content by ID', function(done) {
        this.timeout(10000);

        deleteContent( typeId, contentId )
            .then( ok => {
                return getContent( typeId, contentId );
            })
            .then( c => {
                assert.isFalse( c, true );
                done();
            })
            .catch( err => {
                assert.isFalse(err, true);
                done();
            });
    });

    let ids = [];
    it('Should add multiple contents', async function() {
        this.timeout(30000);

        let status = 'public';
        for( let i = 1; i < 7; i++ ) {
            let odd = i%2;

            let args = {
                typeId: typeId,
                title: 'Test',
                summary: 'A short summary',
                content: 'The full content of a content.',
                status: status,
                author: !! odd ? 1 : 2
            };

            await addContent( args )
                .then( id => {
                    ids.push(id);

                    return id;
                }).catch(err => {
                    console.log(err);

                    return err;
                });

            if ( 'public' === status ) {
                status = 'private';
            } else if ( 'private' === status ) {
                status = 'draft';
            } else {
                status = 'public';
            }
        }

        return true;

    });

    it('Should get contents with no filter', done => {
        getContents({
            typeId: typeId
        })
            .then( c => {
                assert.equal( c.length, 6 );
                done();
            })
            .catch(done);
    });

    it('Should get contents where status = public', done => {
        getContents({
            typeId: typeId,
            status: 'public'
        })
            .then( c => {
                assert.equal( c.length, 2 );
                done();
            })
            .catch(done);
    });

    it('Should get public and private contents', done => {
        getContents({
            typeId: typeId,
            status__in: ['public', 'private']
        })
            .then( c => {
                assert.equal( c.length, 4 );
                done();
            })
            .catch(done);
    });

    it('Should get contents where author=1', done => {
        getContents({
            typeId: typeId,
            author: 1
        })
            .then( c => {
                assert.equal( c.length, 3 );
                done();
            })
            .catch(done);
    });

    it('Should get the contents page 1 of 2', done => {
        getContents({
            typeId: typeId,
            perPage: 3
        })
            .then( c => {
                let _ids = _.pluck( c, 'ID' );
                assert.isTrue( _.isEqual( _ids, ids.slice(0, 3) ), true );
                done();
            })
            .catch(done);
    });

    it('Should get contents page 2 of 2', done => {
        getContents({
            typeId: typeId,
            page: 2,
            perPage: 3
        })
            .then( c => {
                let _ids = _.pluck( c, 'ID' );
                assert.isTrue( _.isEqual( _ids, ids.slice(3) ), true );
                done();
            })
            .catch(done);
    });

    it('Should delete the content type.', function(done) {
        this.timeout(10000);

        deleteContentType(typeId)
            .then(ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });
});