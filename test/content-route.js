'use strict';

const assert = require('chai').assert,
    _ = require('../lib/mixin');

const contentRoute = require('../lib/route/content');

let req = { param: {} };

let res = { json: json => { return json; } };

let next = () => { return true; };
global.currentUser = {ID: 1};

describe('Content routes', () => {
    let typeId;
    let typeIds = [];

    it('Should add new content type via POST', function(done) {
        this.timeout(45000);

        global.$_POST = {
            name: 'Blogs',
            slug: 'blog',
            public: true,
            hierarchical: true,
            hasCategories: true,
            hasComments: true,
            hasTags: true,
            hasArchive: true,
            hasPage: true,
            hasThumbnail: true,
            status: 'active',
            settings: {
                itemsPerPage: 20,
                prefixByCategory: true
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
        contentRoute.getContentTypes(req)
            .then( response => {
                assert.equal( response.contentTypes.length, 1 );
                done();
            })
            .catch(done);
    });

    let contentType;
    it('Should get content type for visual editing', function(done) {
        contentRoute.editContentType({param: {id: typeId}})
            .then( response => {
                assert.equal( response.contentType.ID, typeId );
                contentType = response.contentType;
                done();
            })
            .catch(done);
    });

    let contentId;
    it('Should add content for content type', function(done) {
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
        contentRoute.contentManager({
            param: {
                type: contentType.slug
            }
        })
            .then( response => {
                assert.equal( response.contents.length, 1 );
                done();
            })
            .catch(done);
    });

    it('Should get content of content type for visual editing', function(done) {
        contentRoute.editContent({
            param: {
                id: contentId,
                type: contentType.slug
            }
        })
            .then( response => {
                assert.equal( response.content.ID, contentId );
                done();
            })
            .catch(done);
    });

    let catId;
    it('Should add new category via POST', function(done) {
        global.$_POST = {
            name: 'Apple',
            description: 'An apple a day keeps the doctor away.'
        };

        contentRoute.updateCategory( {
            param: {type: contentType.slug}
        }, res )
            .then( response => {
                assert.isTrue( response.success );
                catId = response.ID;
                done();
            })
            .catch(done);
    });

    it('Should get category listing of content type', function(done) {
        contentRoute.categoryManager({param: {type: contentType.slug}})
            .then( response => {
                assert.equal( response.categories.length, 1 );
                done();
            })
            .catch(done);
    });

    it('Should get category of content type for visual editing', function(done) {
        contentRoute.editCategory({
            param: {
                type: contentType.slug,
                id: catId
            }
        })
            .then( response => {
                assert.equal( response.category.ID, catId );
                done();
            })
            .catch(done);
    });

    it('Should delete category of content type', function(done) {
        contentRoute.deleteCategory( {
            param: {
                id: catId,
                type: contentType.slug
            }
        }, res )
            .then( response => {
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    });

    let tagId;
    it('Should add new tag of content type', function(done) {
        global.$_POST = {
            name: 'Orange',
            description: 'Yummy and healthy'
        };

        contentRoute.updateTag({
            param: {
                type: contentType.slug
            }
        }, res )
            .then( response => {
                assert.isTrue( response.success );
                tagId = response.ID;
                done();
            })
            .catch(done);
    });

    it('Should get tag listings of content type', function(done) {
        contentRoute.tagManager({
            param: {
                type: contentType.slug
            }
        })
            .then( response => {
                assert.equal( response.tags.length, 1 );
                done();
            })
            .catch(done);
    });

    it('Should get tag of content type for visual editing', function(done) {
        contentRoute.editTag({
            param: {
                type: contentType.slug,
                id: tagId
            }
        })
            .then( response => {
                assert.equal( response.tag.ID, tagId );
                done();
            })
            .catch(done);
    });

    it('Should delete tag of content type', function(done) {
        contentRoute.deleteTag({
            param: {
                type: contentType.slug,
                id: tagId
            }
        }, res )
            .then( response => {
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    });

    let commentId;

    it('Should add content comment of content type via POST', function(done) {
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

    it( 'Should get comments list of content type', function(done) {
        contentRoute.commentsManager({
            param: {
                type: contentType.slug
            }
        })
            .then( response => {
                assert.equal( response.comments.length, 1 );
                done();
            })
            .catch(done);
    });

    it('Should get comment of content type for visual editing', function(done) {
        contentRoute.editComment({
            param: {
                type: contentType.slug,
                id: commentId
            }
        })
            .then( response => {
                assert.equal( response.comment.ID, commentId );
                done();
            })
            .catch(done);
    });

    it('Should delete comment of content type', function(done) {
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

    it('Should close database connection', done => {
        dbManager.close();
        done();
    });
});