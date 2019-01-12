'use strict';

const assert = require('chai').assert;

describe('Drop all tables', function() {

    let tables = ['users', 'user_group', 'user_settings', 'settings', 'presets', 'content_types'];

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

    it('Should close database connection', done => {
        dbManager.close();
        done();
    });
});