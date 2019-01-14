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
    })
});