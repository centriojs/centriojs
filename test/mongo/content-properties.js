'use strict';

const assert = require('chai').assert,
    _ = require('../../lib/mixin');

require('./config');

describe('MySQL: Content property queries', () => {
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
            status: 'public'
        })
            .then( id => {
                contentId = id;
                assert.isNumber( id, true );
                done();
            })
            .catch(done);
    });

    it('Should set new content property', function(done) {
        this.timeout(3000);

        setContentProperty({
            typeId: typeId,
            contentId: contentId,
            name: 'screenId',
            value: 1234
        })
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should update content property', function(done) {
        this.timeout(5000);

        setContentProperty({
            typeId: typeId,
            contentId: contentId,
            name: 'screenId',
            value: 'today'
        }, true )
            .then( ok => {
                return getContentProperty( typeId, contentId, 'screenId', true );
            })
            .then( value => {
                assert.equal( value, 'today' );
                done();
            })
            .catch(done);
    });

    it('Should add content property of the same name', function(done) {
        this.timeout(5000);
        setContentProperty({
            typeId: typeId,
            contentId: contentId,
            name: 'screenId',
            value: 'mitchell'
        })
            .then( () => {
                return getContentProperty( typeId, contentId, 'screenId' );
            })
            .then( values => {
                console.log(values);
                assert.isArray( values, true );
                done();
            })
            .catch(done);
    });

    it('Should get all properties of a content', function(done) {
        this.timeout(5000);

        getContentProperties( typeId, contentId )
            .then( props => {
                console.log(props);
                assert.isObject( props, true );
                done();
            })
            .catch(done);
    });

    it('Should delete content property with value', function(done) {
        this.timeout(15000);

        deleteContentProperty( typeId, contentId, 'screenId', 'today' )
            .then( () => {
                return getContentProperty( typeId, contentId, 'screenId' );
            })
            .then( values => {
                assert.isArray( values, true );
                done();
            })
            .catch(done);
    });

    it('Should get all properties of a content', function(done) {
        this.timeout(5000);

        getContentProperties( typeId, contentId )
            .then( props => {
                assert.isObject( props, true );
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
});