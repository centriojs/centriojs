'use strict';

const assert = require('chai').assert,
    path = require('path'),
    _ = require('../lib/mixin');

global.ABSPATH = path.resolve( __dirname, '../../demo/app-mysql');

require('../lib/load');

let installRoute = require('../lib/route/install');

let req = {param: {}},
    res = { json: json => { return json; } };

describe( 'Installation cycle', () => {
    installRoute = installRoute();

    it('Should install database and set app setup.', function(done) {
        this.timeout(15000);

        global.$_POST = {
            dbName: 'centriojs_test',
            dbUser: 'root',
            dbPass: 'root',
            prefix: 'cjms_',
            appName: 'Test Application',
            display: 'admin',
            email: 'admin@local.dev',
            pass: 123456
        };

        installRoute.validateSetup( req, res )
            .then( response => {
                console.log(response);
                done();
            })
            .catch(done);
    });

    it('Should close database connection', done => {
        if ( global.dbManager ) {
            dbManager.close();
        }
        done();
    });

    /**

    it( 'Should check database connection', function(done) {
        global.$_POST = dbConfig;

        installRoute.createConfiguration( req, res )
            .then( response => {
                dbManager.close();
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    } );

    it( 'Should install tables', function(done) {
        this.timeout(5000);

        global.dbManager = DatabaseManager(dbConfig);

        installRoute.installTables( req, res )
            .then( response => {
                dbManager.close();
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    } );

    it( 'Should set app settings and default default contents', function(done) {

        global.$_POST = {
            appName: 'Test Application',
            tagline: 'The coolest application ever.',
            display: 'admin',
            email: 'admin@local.dev',
            pass: 123457
        };

        installRoute.updateConfig( req, res )
            .then( response => {
                dbManager.close();
                assert.isTrue( response.success );
                done();
            })
            .catch(done);
    } );

     **/
} );