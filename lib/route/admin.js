'use strict';

const MainRouter = require('./main'),
    _ = require('../mixin');

class AdminRouter extends MainRouter {
    constructor(app) {
        super(app);
    }
}
module.exports = AdminRouter;