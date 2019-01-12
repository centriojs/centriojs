'use strict';

const assert = require('chai').assert;

describe('Drop all tables', function() {

    let tables = ['users', 'user_group', 'user_settings', 'settings', 'presets'];

    for( let i = 0; i < tables.length; i++ ) {
        let table = tables[i];

        it(`Should drop table ${table}`, function(done) {
            this.timeout(5000);

            dbManager.execQuery(table).dropTable()
                .then( ok => {
                    assert.isOk( ok, true );
                    done();
                })
                .catch( err => {
                    done(err.message);
                });
        })
    }

    it('Should delete all content types and drop content_types table', function(done) {
        this.timeout(55000);


        getContentTypes({perPage: -1})
            .then( async list => {

                if ( ! list.length ) {
                    return true;
                }

                for( let i = 0; i < list.length; i++ ) {
                    await deleteContentType(list[i].ID).catch(errorHandler);
                }

                return dbManager.execQuery('content_types').dropTable();
            })
            .then( () => {
                done();
            })
            .catch(done);
    });

    it('Should close database connection', done => {
        dbManager.close();
        done();
    });
});