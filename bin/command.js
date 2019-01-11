#!/usr/bin/env node

const [,,...args] = process.argv,
    path = require('path');

global.ABSPATH = process.cwd();

// Require loader
require('../lib/load');

const command = args.shift();

let cmdArgs = {};

args.map( arg => {
    if ( arg.match('--') ) {
        let _arg = arg.split('='),
            name = _arg[0].replace(/--/, '');

        cmdArgs[name] = _arg[1];
    }
});

let location;

switch( command ) {
    case 'create-app' :
        location = args.shift();

        // Create main directory
        mkDir(location)
            .catch( err => {
                console.log(err);
            })
            .then( () => {
                // Create themes folder
                let themePath = path.resolve( location, './themes' );

                return mkDir(themePath);
            })
            .then( () => {
                // Create modules folder
                let modulesPath = path.resolve( location, './modules' );

                return mkDir(modulesPath);
            })
            .then( () => {
                let port = cmdArgs.port || 80,
                    host = cmdArgs.host || 'localhost';

                // Info here
                let config = `const CentrioJs = require('centriojs');

CentrioJs.listen( ${port}, '${host}' );`;

                let file = path.resolve(location + '/app.js');

                return writeFile( file, config );
            })
            .catch( err => {
                console.log(err);
            });
        break;

    case 'arg' :
        console.log(cmdArgs);
        break;
}