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
    {decrypt} = require('../encrypt'),
    _ = require('../mixin'),
    Router = require('./www');

class MainRouter extends Router {}

class App {
    constructor() {

        app.set( 'x-powered-by', 'CentrioJS' );

        let middleWare = [
            cookieParser(),
            bodyParser.json(),
            bodyParser.urlencoded({extended: true}),
            (r, s, n) => this.setGlobals( r, s, n )
        ];

        app.use(middleWare);

        app.use([
            express.static( path.resolve( ABSPATH, './modules' ) ),
            express.static( path.resolve( ABSPATH, './themes' ) ),
            express.static( path.resolve( ABSPATH, './uploads') ),
            //express.static( path.resolve( ABSPATH, './assets' ) ),
            //express.static( path.resolve( __dirname, '../../assets'))
        ]);

        if ( ! this.checkDatabase() ) {
            app.use( this.install.bind(this) );
            return;
        }

        app.use([
            this.checkConnection.bind(this),
            this.init.bind(this)
        ]);

        app.use( '/admin', adminRoute );
        app.use( this.load.bind(this) );

        this.adminRouter = new AdminRouter(adminRoute);
        this.mainRouter = new MainRouter(app);
    }

    async checkDatabase() {
        let config = path.resolve( ABSPATH, './config.js' );

        try {
            config = require(config);
            global.dbManager = DatabaseManager(config);
        } catch(e) {
            // Do nothing
            return false;
        }

        let users = await getUsers( {group: 'administrator'} );

        return users.length > 0;
    }

    setGlobals( req, res, next ) {
        global.$_GET = req.query;
        global.$_POST = 'POST' === req.method ? req.body : {};
        global.$_COOKIE = req.cookies;
        global.COOKIEPATH = '/';
        global.COOKIEHASH = '';
        global.COOKIEDOMAIN = '';
        global.currentUser = false;

        next();
    }

    install( req, res, next ) {
        require('./install')(this.mainRouter);

        next();
    }

    setStaticFiles() {
        app.use([
            express.static( path.resolve( ABSPATH, './modules' ) ),
            express.static( path.resolve( ABSPATH, './themes' ) ),
            express.static( path.resolve( ABSPATH, './uploads') ),
            //express.static( path.resolve( ABSPATH, './assets' ) ),
            //express.static( path.resolve( __dirname, '../../assets'))
        ]);
    }

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

        next();
    }

    async init( req, res, next ) {
        require('./user');
        require('./content');

        // Check if user is currently logged in
        if ( ! _.isEmpty($_COOKIE.__usr__) ) {
            // Set current user
            await decrypt($_COOKIE.__usr__)
                .then( str => {
                    return getUserBy( 'email', str );
                })
                .then( user => {
                    global.currentUser = user;

                    return true;
                })
                .catch(errorHandler);
        }

        await appEvent.trigger( 'init', this.mainRouter );

        next();
    }

    async load( req, res, next ) {
        await appEvent.trigger( 'loaded', this.mainRouter );

        next();
    }
}
new App();

module.exports = app;