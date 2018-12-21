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

        let arr = ['one', 'two', 'three'],
            val = arr.fill(true);
        arr = _.object(arr, val);//.range(0, arr.length).fill(true));

        console.log(arr);
    });
});
