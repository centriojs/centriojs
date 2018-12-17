'use strict';

const assert = require('chai').assert;

require('../lib/load');

global.ABSPATH = __dirname;

describe('Filesystem: Directory', () => {
    let dir = 'test-area';

    it('mkDir: Should create a new directory', done => {
        mkDir(dir)
            .then( ok => {
                assert.isOk(ok, true);
                done();
            })
            .catch( done );
    });


    it('rmDir: Should delete `test-area` directory.', done => {
        rmDir(dir)
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });
});