'use strict';

const MainRouter = require('./www'),
    _ = require('../mixin');

class AdminRouter extends MainRouter {
    constructor(router) {
        super(router);

        this.isAdmin = true;

        router.use( this.authenticate.bind(this) );
        this.setView( '/', this.dashboard.bind(this), true, 'administer' );
    }

    async authenticate( req, res, next ) {
        require('../route/preset');

        await appEvent.trigger( 'adminInit', this );

        next();
    }

    async dashboard() {
        let response = {
            title: il8n('Administration Area')
        };

        return response;
    }
}
module.exports = AdminRouter;