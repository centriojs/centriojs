'use strict';

const MainRouter = require('./www'),
    Cache = require('../cache'),
    _ = require('../mixin');

class AdminRouter extends MainRouter {
    constructor(router) {
        super(router);

        this.isAdmin = true;

        router.use( this.authenticate.bind(this) );
        this.setView( '/', this.dashboard.bind(this), true, 'administer' );
        this.setGetResponse( '/clear-cache', this.clearCache.bind(this), 'administrator' );
    }

    async authenticate( req, res, next ) {
        require('../route/preset');

        await appEvent.trigger( 'adminInit', this );

        next();
    }

    async dashboard() {
        let response = {
            title: il8n('Administration Area'),
            templateNow: 'AdminDashboard',
            path: '/admin',
            typeNow: 'dashboard'
        };

        return response;
    }

    clearCache( req, res ) {
        Cache.clearAll();

        let response = {
            success: true,
            message: il8n('All cached are now cleared.')
        };

        return res.json(response);
    }
}
module.exports = AdminRouter;