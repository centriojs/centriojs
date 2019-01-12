'use strict';

const assert = require('chai').assert,
    path = require('path'),
    _ = require('../lib/mixin'),
    Cache = require('../lib/cache');

global.ABSPATH = path.resolve( __dirname, '../../demo/app-mysql');

require('../lib/load');

let installRoute = require('../lib/route/install');

let req = {param: {}},
    res = { json: json => { return json; } };

describe( 'Installation cycle', () => {
    installRoute = installRoute();

    it('Should install database and set app setup.', function(done) {
        this.timeout(25000);

        Cache.set( 'database', 'db', global.dbConfig.database );

        global.$_POST = _.extend( global.dbConfig, {
            appName: 'Test Application',
            display: 'admin',
            email: 'admin@local.dev',
            pass: 123456
        });

        installRoute.validateSetup( req, res )
            .then( response => {
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    });

    it('Should close database connection', done => {
        if ( dbManager ) {
            dbManager.close();
        }

        done();
    });
} );