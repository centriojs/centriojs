'use strict';

const express = require('express'),
    path = require('path'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    app = express(),
    Cache = require('../cache'),
    adminRoute = express.Router(),
    AdminRouter = require('./admin'),
    {DatabaseManager} = require('../db'),
    {randomSalt} = require('../encrypt'),
    Router = require('./www');

class MainRouter extends Router {}

class App {
    constructor() {
        app.set( 'x-powered-by', 'CentrioJS' );
        this.adminRouter = new AdminRouter(adminRoute);
        this.mainRouter = new MainRouter(app);

        // Set database manager
        this.setDatabase();

        let middleWare = [
            cookieParser(),
            bodyParser.json(),
            bodyParser.urlencoded({extended: true}),
            (r, s, n) => this.setGlobals( r, s, n )
        ];

        if ( ! global.dbManager ) {
            middleWare.push( this.install.bind(this) );
            app.use(middleWare);

            return;
        }

        middleWare = middleWare.concat([
            this.checkConnection.bind(this),
            this.setCookies.bind(this),
            this.init.bind(this)
        ]);

        app.use(middleWare);
        app.use( '/admin', adminRoute );
    }

    async setDatabase() {
        let config = path.resolve( ABSPATH, './config.js' );

        try {
            config = require(config);
            global.dbManager = DatabaseManager(config);
        } catch(e) {
            // Do nothing
            return false;
        }

        let users = await getUsers( {group: 'administrator'} );

        if ( users.length ) {
            setGlobalVar( 'dbManager', dbManager );

            return;
        }

        global.dbManager = false;
    }

    setGlobals( req, res, next ) {
        global.$_GET = req.query;
        global.$_POST = 'POST' === req.method ? req.body : {};
        global.$_COOKIES = req.cookies;
        global.COOKIEPATH = '/';
        global.COOKIEHASH = '';
        global.currentUser = false;

        setGlobalVar( '$_COOKIE', req.cookies );

        next();
    }

    install( req, res, next ) {
        require('./install')(this.mainRouter);

        next();
    }

    setStaticFiles() {}

    async checkConnection( req, res, next ) {
        // Check db connection once daily
        const lastCheck = Cache.get( '__dbConnection', 'connection' ),
            time = Date.now(),
            interval = 86400 * 60000;

        if ( ! lastCheck || time > lastCheck ) {
            let done = await dbManager.checkConnection().catch(errorHandler);

            if ( done.error ) {
                return this.mainRouter.error( 'Connection Error', 'Cannot establish database connection.' )(req, res);
            }

            Cache.set( '__dbConnection', 'connection', time + interval );
        }

        // Get or generate keys
        let keys = await getSetting('__keys').catch(errorHandler);

        if ( ! keys || keys.error || keys.time <= time ) {
            // Generate keys
            keys = {
                auth: randomSalt(16, 15, 'hex'),
                login: randomSalt(16, 15, 'hex'),
                time: time + (interval * 30) // Save the keys for 30 days
            };

            await setSetting( '__keys', keys ).catch(errorHandler);
        }

        global.COOKIEHASH = keys.auth;

        next();
    }

    setCookies( req, res, next ) {
        next();
    }

    async init( req, res, next ) {
        require('./user');
        require('./content');

        await appEvent.trigger( 'init', this.mainRouter );

        next();
    }
}
new App();

module.exports = app;