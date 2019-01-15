'use strict';

const assert = require('chai').assert,
    _ = require('../../lib/mixin');

describe('Preset contents', () => {
    let Blog;

    it('Should get blog content type', function(done) {
        this.timeout(5000);

        getContentTypeBy( 'slug', 'blog' )
            .then( blog => {
                assert.equal( blog.slug, 'blog' );
                Blog = blog;
                done();
            })
            .catch();
    });

    it('Should add blog post', function(done) {
        this.timeout(5000);

        addContent({
            typeId: Blog.ID,
            title: 'Hello World',
            status: 'public',
            author: 1,
            content: 'I am the new world, the new beginning in the new era.'
        })
            .then( id => {
                assert.isNumber(id);
                done();
            })
            .catch();
    });

    let Categories;
    it('Should get categories tax', function(done) {
        this.timeout(5000);

        getContentTypeBy( 'slug', 'categories' )
            .then( content => {
                assert.equal( content.slug, 'categories' );
                Categories = content;
                done();
            })
            .catch();
    });

    let catId;
    it('Should category term', function(done) {
        this.timeout(5000);

        insertTerm({
            typeId: Categories.ID,
            name: 'Apple',
            description: 'An apple a day keeps the doctor away.'
        })
            .then( id => {
                assert.isNumber(id);
                catId = id;
                done();
            })
            .catch();
    });

    let Pages;

    it('Should get pages content type', function(done) {
        this.timeout(5000);

        getContentTypeBy( 'slug', 'pages' )
            .then( type => {
                assert.equal( type.slug, 'pages' );
                Pages = type;
                done();
            })
            .catch();
    });

    it('Should insert content for type pages', function(done) {
        this.timeout(5000);

        addContent({
            typeId: Pages.ID,
            title: 'Sample Page',
            status: 'public',
            author: 1,
            content: 'Write the sample page'
        })
            .then( id => {
                assert.isNumber(id);
                done();
            })
            .catch();
    });
});