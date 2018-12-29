'use strict';

const assert = require('chai').assert,
    _ = require('../../lib/mixin');

require('./config');

describe('Mongo: Content categories and tax', () => {
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

    let catId;

    it('Should insert new category', function(done) {
        this.timeout(5000);

        addCategory( typeId, {
            name: 'Apple',
            description: 'Description of an apple'
        } )
            .then( id => {
                catId = id;
                assert.isNumber( id, true );
                done();
            })
            .catch(done);
    });

    it('Should update category', function(done) {
        this.timeout(5000);

        updateCategory( typeId, {
            name: 'Orange',
            ID: catId
        })
            .then( c => {
                assert.equal( c, catId );
                done();
            })
            .catch(done);
    });

    it('Should get the newly inserted category', function(done) {
        this.timeout(3000);

        getCategory( typeId, catId )
            .then( c => {
                assert.equal( c.name, 'Orange' );
                done();
            })
            .catch(done);
    });

    it('Should delete the category', function(done) {
        this.timeout(5000);

        deleteCategory( typeId, catId )
            .then( () => {
                return getCategory( typeId, catId );
            })
            .then( f => {
                assert.isFalse( f, true );
                done();
            })
            .catch(done);
    });

    let ids = [];
    it('Should add multiple categories', async function() {
        this.timeout(25000);

        for( let i = 0; i < 10; i++ ) {
            let odd = i % 2;

            let args = {
                name: 'Category ' + i,
                description: 'Some category description',
                parent: odd ? 1 : 2
            };

            await addCategory( typeId, args )
                .then( id => {
                    ids.push(id);
                    return id;
                }).catch(returnFalse);
        }

        return true;
    });

    it('Should get categories with no filter', function(done) {
        this.timeout(5000);

        getCategories( typeId )
            .then( c => {
                assert.equal( c.length, ids.length );
                done();
            })
            .catch(done);
    });

    it('Should get categories where parent = 1', function(done) {
        this.timeout(5000);

        getCategories( typeId, {parent: 1})
            .then( c => {
                assert.equal( c.length, 5 );
                done();
            })
            .catch(done);
    });

    it('Should get categories by category IDs', function(done) {
        this.timeout(5000);

        getCategories( typeId, {
            include: ids.slice(0, 3)
        })
            .then( c => {
                let _ids = _.pluck( c, 'ID' );
                assert.isTrue(_.isEqual(_ids, ids.slice(0, 3)));
                done();
            })
            .catch(done);
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