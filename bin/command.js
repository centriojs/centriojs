#!/usr/bin/env node

const [,,...args] = process.argv,
    path = require('path');

global.ABSPATH = process.cwd();

// Require loader
require('../lib/load');

const command = args.shift();

let location;

switch( command ) {
    case 'create' :
        location = args.shift();

        mkDir(location)
            // Return true to continue the cycle if the directory already exist
            .catch( returnTrue )
            .then( () => {
                // Create themes folder
                let themePath = path.resolve(location, './themes');

                return mkDir(themePath).catch(returnTrue);
            })
            .then( () => {
                // Create modules folder
                let modulesPath = path.resolve(location, './modules');

                return mkDir(modulesPath).catch(returnTrue);
            })
            .then( () => {
                // Create app.js file
                let app = `'use strict';
                
const centrio = require('centrio');

// Set configuration    
centrio.config({
    // Set the database type to use for this application. [mysql, mongodb]
    database: 'mysql',
    dbHost: 'localhost',
    dbName: '',
    dbUser: '',
    dbPass: '',
    dbPort: '3306'
});

// Change this to your actual \`Port\` number and \`hostname\`.
centrio.listen(80, 'localhost');`;

                let filename = path.resolve(location, 'app.js');

                return writeFile(filename, app).catch(returnTrue);
            });

        break;
}