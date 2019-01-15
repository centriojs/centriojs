'use strict';

const assert = require('chai').assert,
    _ = require('../../lib/mixin');

describe('Users setter', () => {
    let users = [];

    it('Should add multiple subscriber users', async function() {
        this.timeout(55000);

        let name = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase().split('');

        for ( let i = 0; i < name.length; i++ ) {
            let display = name[i] + 'user',
                email = display.toLowerCase() + '@local.dev';

            await addUser({
                display: display,
                email: email,
                pass: 123456,
                group: 1
            })
                .then( id => {
                    assert.isNumber(id);
                    users.push(id);

                    return true;
                })
                .catch( err => {
                    console.log(err);
                });
        }

        return true;
    });
});