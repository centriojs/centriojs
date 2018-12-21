'use strict';

const assert = require('chai').assert,
    _ = require('../lib/mixin');

require('../lib/load');

describe('addQueryParam', () => {
    let uri = 'http://demohub.local?irene=mitch';

    it('Should add `key` with `value` value in the URI.', done => {
        let add1 = _.addQueryParam( uri, 'key', 'value' ),
            added = add1.match(/key|value/);

        console.log(add1);
        assert.isOk( added, true );
        done();
    });
});

describe( 'appEvent cycle', () => {
    it('Should add an action hook name: test1 on `tester` action event.', done => {
        appEvent.on( 'tester', function test1() {
            console.log('Test 1');
        }, 5 );
        done();
    });

    it('Should add an action hook name: test2 with higher priority', done => {
        appEvent.on( 'tester', function test2() {
            console.log('Test 2');
        });
        done();
    });

    it('Should execute all hooked callable functions of `tester` event.', async () => {
       return appEvent.trigger( 'tester' );
    });
});

describe('Filter cycle', () => {
    it('Should change the value from 1 to 5', done => {
        Filter.on( 'val', function test1() {
            return 5;
        });

        done();
    });

    it('Should return the filtered value', async () => {
        let value = await Filter.apply( 'val', 1 );

        return assert.equal( 5, value );
    });
});
