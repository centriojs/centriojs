'use strict';

const assert = require('chai').assert,
    _ = require('../lib/mixin');

require('./install');

const contentRoute = require('../lib/route/content');

let req = { param: {} };

let res = { json: json => { return json; } };

let next = () => { return reject('An error occurred.'); };
global.currentUser = {ID: 1};

describe('Content routes', () => {
    let typeId;
    let typeIds = [];

    it('Should add new content type via POST with properties', function(done) {
        this.timeout(45000);

        global.$_POST = {
            name: 'Blogger Area',
            slug: 'blogger',
            hierarchical: true,
            hasComments: true,
            hasArchive: true,
            hasPage: true,
            hasThumbnail: true,
            status: 'active',
            settings: {
                itemsPerPage: 50,
                archiveTitle: 'Blog',
                archiveDescription: 'All the bloggers will go here.'
            }
        };

        contentRoute.updateContentType( req, res )
            .then( response => {
                assert.isTrue( response.success );
                typeId = response.ID;

                done();
            })
            .catch(done);
    });

    it('Should get content types listings', function(done) {
        this.timeout(5000);

        contentRoute.getContentTypes(req)
            .then( response => {
                assert.equal( response.contentTypes.length, 4 );
                done();
            })
            .catch(done);
    });

    let contentType;
    it('Should get content type for visual editing', function(done) {
        this.timeout(15000);

        contentRoute.editContentType({id: typeId})
            .then( response => {
                assert.equal( response.contentType.ID, typeId );
                contentType = response.contentType;
                done();
            })
            .catch(done);
    });

    let contentId;
    it('Should add content for content type', function(done) {
        this.timeout(15000);

        let slug = contentType.slug;

        global.$_POST = {
            title: 'Hello World',
            content: 'The full content description of hello world.',
            status: 'public'
        };

        contentRoute.updateContent({param: {type: slug}}, res )
            .then( response => {
                assert.isTrue( response.success );
                contentId = response.ID;
                done();
            })
            .catch(done);
    });

    it('Should get content listing of content type', function(done) {
        this.timeout(15000);

        contentRoute.contentManager({
            type: contentType.slug
        })
            .then( response => {
                assert.equal( response.contents.length, 1 );
                done();
            })
            .catch(done);
    });

    it('Should get content of content type for visual editing', function(done) {
        this.timeout(15000);

        contentRoute.editContent({
            id: contentId,
            type: contentType.slug
        })
            .then( response => {
                assert.equal( response.content.ID, contentId );
                done();
            })
            .catch(done);
    });

    let commentId;

    it('Should add content comment of content type via POST', function(done) {
        this.timeout(15000);

        global.$_POST = {
            comment: 'Hey you what\'s up'
        };

        contentRoute.updateComment( {
            param: {
                type: contentType.slug,
                contentId: contentId
            }
        }, res )
            .then( response => {
                assert.isTrue( response.success );
                commentId = response.ID;
                done();
            })
            .catch(done);
    });

    it('Should get comment of content type for visual editing', function(done) {
        this.timeout(25000);

        contentRoute.editComment({
            type: contentType.slug,
            id: commentId
        })
            .then( response => {
                assert.equal( response.comment.ID, commentId );
                done();
            })
            .catch(done);
    });

    it( 'Should get comments list of content type', function(done) {
        this.timeout(25000);

        contentRoute.commentsManager({
            type: contentType.slug
        })
            .then( response => {
                assert.equal( response.comments.length, 1 );
                done();
            })
            .catch(done);
    });

    it('Should delete comment of content type', function(done) {
        this.timeout(15000);

        contentRoute.deleteComment({
            param: {
                type: contentType.slug,
                id: commentId
            }
        }, res )
            .then( response => {
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    });

    it('Should delete content of content type', function(done) {
        this.timeout(15000);

        contentRoute.deleteContent({
            param: {
                id: contentId,
                type: contentType.slug
            }
        }, res )
            .then( response => {
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    });

    it('Should delete content type', function(done) {
        this.timeout(10000);

        contentRoute.deleteContentType( {param: {id: typeId}}, res )
            .then( response => {
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    });
});

require('./reset');