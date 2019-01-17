'use strict';

const assert = require('chai').assert;

describe('Drop all tables', function() {
    it('Should delete all content types and drop content_types table', function(done) {
        this.timeout(55000);

        getContentTypes({})
            .then( async list => {
                if ( ! list.length ) {
                    return dbManager.execQuery('content_types').dropTable();
                }

                for( let i = 0; i < list.length; i++ ) {
                    await deleteContentType(list[i].ID).catch(errorHandler);
                }

                done();
            })
            .catch(done);
    });

    let tables = ['users', 'user_group', 'user_settings', 'user_activity',
        'settings', 'presets', 'endpoint', 'content_types', 'type_properties'];

    for( let i = 0; i < tables.length; i++ ) {
        let table = tables[i];

        it(`Should drop table ${table}`, function(done) {
            this.timeout(15000);

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
});