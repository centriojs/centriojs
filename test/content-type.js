'use strict';

const assert = require('chai').assert,
    _ = require('../lib/mixin');

describe('Content type queries', () => {
    let typeId;

    it('Should insert content type of type content', function(done) {
        this.timeout(5000);

        addContentType({
            name: 'Tester',
            hasArchive: true,
            hasPage: true,
            showUI: true,
            hierarchical: true
        })
            .then( id => {
                assert.isNumber(id);
                typeId = id;
                done();
            })
            .catch(done);
    });

    it('Should property for content type', function(done) {
        this.timeout(5000);

        setTypeProperty( typeId, 'itemPerPage', 20, true )
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should get properties of content type', function(done) {
        this.timeout(5000);

        getTypeProperty( typeId )
            .then( results => {
                assert.equal( results.itemPerPage, 20 );
                done();
            })
            .catch(done);
    });

    it('Should update property value', function(done) {
        this.timeout(5000);

        setTypeProperty( typeId, 'itemPerPage', 50, true )
            .then( () => {
                return getTypeProperty( typeId, 'itemPerPage', true );
            })
            .then( perPage => {
                assert.equal( perPage, 50 );
                done();
            })
            .catch(done);
    });

    it('Should delete property of content type', function(done) {
        this.timeout(5000);

        deleteTypeProperty( typeId )
            .then( () => {
                return getTypeProperty(typeId);
            })
            .then( ok => {
                assert.isEmpty(ok);
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

    it('Should get content by ID', function(done) {
        this.timeout(5000);

        getContent( typeId, contentId )
            .then( c => {
                assert.equal( contentId, c.ID );
                done();
            })
            .catch(done);
    });

    it('Should get content by slug', function(done) {
        this.timeout(5000);

        getContentBy( typeId, 'slug', 'hello-content' )
            .then( c => {
                assert.equal( contentId, c.ID );
                done();
            })
            .catch(done);
    });

    it('Should update content title', function(done) {
        this.timeout(15000);

        updateContent({
            typeId: typeId,
            ID: contentId,
            title: 'Test Content Title',
            slug: 'test-content-title'
        })
            .then( id => {
                return getContent( typeId, id );
            })
            .then( c => {
                assert.equal( c.title, 'Test Content Title' );
                done();
            })
            .catch(done);
    });

    it('Should set content property', function(done) {
        this.timeout(5000);

        setContentProperty({
            typeId: typeId,
            contentId: contentId,
            name: 'category',
            value: 1
        }, true )
            .then( () => {
                return getContentProperty( typeId, contentId, 'category', true );
            })
            .then( val => {
                assert.equal( 1, val );
                done();
            })
            .catch(done);
    });

    it('Should delete content property', function(done) {
        this.timeout(15000);

        deleteContentProperty( typeId, contentId )
            .then( () => {
                return getContentProperty( typeId, contentId );
            })
            .then( r => {
                assert.isEmpty(r);
                done();
            })
            .catch(done);
    });

    let catTypeId;
    it('Should add content type of type tax', function(done) {
        this.timeout(5000);

        addContentType({
            name: 'Categories',
            type: 'tax',
            hierarchical: true,
            hasArchive: true,
            hasPage: true
        })
            .then( id => {
                assert.isNumber(id);
                catTypeId = id;
                done();
            });
    });

    let termId;
    it('Should add new term', function(done) {
        this.timeout(15000);

        insertTerm({
            typeId: catTypeId,
            name: 'Apple',
            description: 'The apple description'
        })
            .then( id => {
                termId = id;
                return getTerm( catTypeId, id );
            })
            .then( term => {
                assert.equal( term.name, 'Apple' );
                done();
            })
            .catch(done);
    });

    it('Should delete term from content type of type tax', function(done) {
        this.timeout(15000);

        deleteTerm( catTypeId, termId )
            .then( () => {
                return getTerms({typeId: catTypeId});
            })
            .then( terms => {
                assert.isEmpty(terms);
                done();
            })
            .catch(done);
    });

    it('Should get content type of tax', function(done) {
        this.timeout(5000);

        getContentType(catTypeId)
            .then( type => {
                assert.equal( type.ID, catTypeId );
                done();
            })
            .catch(done);
    });
});