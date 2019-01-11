'use strict';

const MainRouter = require('./www'),
    _ = require('../mixin');

class AdminRouter extends MainRouter {
    constructor(router) {
        super(router);

        this.isAdmin = true;
    }

    authenticate( req, res, next ) {
        if ( ! isUserLoggedIn() ) {
            // @todo: show admin page
        }

        next();
    }
}
module.exports = AdminRouter;