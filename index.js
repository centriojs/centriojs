'use strict';

const http = require('http'),
    https = require('https');

const appListener = (port, host, ssl) => {
    let server;

    global.ABSPATH = process.cwd();

    if ( ! ssl ) {
        server = http.createServer( ( req, res ) => {
            require('./lib/load');

            return require('./lib/route/app')( req, res );
        } );
    }

    server.listen( port, host );

    // @todo: set ssl here
};

module.exports = {
    listen: appListener
};