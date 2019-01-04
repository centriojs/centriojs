'use strict';

const assert = require('chai').assert,
    _ = require('../lib/mixin');

describe('Content comment queries', () => {
    let typeId;

    it('Should add new content type name=tester', function(done) {
        this.timeout(15000);

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
            status: 'public'
        })
            .then( id => {
                contentId = id;
                assert.isNumber( id, true );
                done();
            })
            .catch(done);
    });

    let commentId;

    it('Should insert new comment', function(done) {
        this.timeout(3000);

        addComment( typeId, {
            contentId: contentId,
            status: 'publish',
            comment: 'Á test comment here',
            authorId: 1
        })
            .then( id => {
                commentId = id;

                assert.isNumber(id, true);
                done();
            })
            .catch(done);
    });

    it('Should update and get comment by id', function(done) {
        this.timeout(5000);

        updateComment( typeId, {
            contentId: contentId,
            ID: commentId,
            status: 'spam'
        })
            .then( id => {
                return getComment( typeId, id );
            })
            .then( comment => {
                assert.equal( comment.ID, commentId );
                done();
            })
            .catch(done);
    });

    it('Should delete comment', function(done) {
        this.timeout(5000);

        deleteComment( typeId, commentId )
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    let ids = [];
    it('Should add multiple comments', async function() {
        this.timeout(50000);

        let args = {
            contentId: contentId,
            comment: 'The comment here',
            authorId: 1,
            status: 'publish'
        };

        for( let i = 0; i < 10; i++ ) {

            await addComment( typeId, args )
                .then( id => {
                    ids.push(id);
                    return id;
                })
                .catch(returnFalse);

            if ( 'publish' === args.status ) {
                args.status = 'pending';
                args.authorId = 0;
                args.author = 'irene';
                args.authorEmail = 'irene@local.dev';
            } else if ( 'pending' === args.status ) {
                args.status = 'spam';
                args.authorId = 2;
            } else {
                args.status = 'publish';
                args.authorId = 1;
            }
        }
    });

    it('Should get comments by author id', function(done) {
        this.timeout(20000);

        getComments({
            typeId: typeId,
            authorId: 1
        })
            .then( comments => {
                assert.equal( comments.length, 4 );
                done();
            })
            .catch(done);
    });

    it('Should delete content by ID', function(done) {
        this.timeout(15000);

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

    it('Should delete the content type.', function(done) {
        this.timeout(15000);

        deleteContentType(typeId)
            .then(ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should close database connection', done => {
        dbManager.close();
        done();
    });
});