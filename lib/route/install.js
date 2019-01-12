'use strict';

const _ = require('../mixin'),
    path = require('path'),
    Cache = require('../cache'),
    {DatabaseManager} = require('../db');

const createTables = async () => {
    let errMsg = il8n('Something went wrong. Please check your database configuration.');

    // `users`
    let columns = [
        '`ID` BIGINT(20) NOT NULL PRIMARY KEY AUTO_INCREMENT',
        '`display` VARCHAR(30) NOT NULL',
        '`email` VARCHAR(50) NOT NULL',
        '`pass` VARCHAR(100) NOT NULL',
        '`group` VARCHAR(50) NOT NULL',
        '`dateRegistered` DATETIME DEFAULT CURRENT_TIMESTAMP',
        'Index (`ID`, `email`, `group`)'
    ],
        indexes = [];

    let isMongo = 'mongodb' === dbManager.typer;
    if ( isMongo ) {
        columns = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['display', 'email', 'pass', 'group'],
                    properties: {
                        ID: {
                            bsonType: 'int'
                        },
                        display: {
                            bsonType: 'string',
                            maximumLength: 30
                        },
                        email: {
                            bsonType: 'string',
                            maximumLength: 50
                        },
                        pass: {
                            bsonType: 'string',
                            maximum: 100
                        },
                        group: {
                            bsonType: 'string',
                            maximum: 50
                        },
                        dateRegistered: {
                            bsonType: 'date'
                        }
                    }
                }
            }
        };
        indexes = ['ID', 'display', 'email', 'group'];
    }

    let done = await dbManager.execQuery('users').createTable( columns, indexes ).catch(errorHandler);
    if ( ! done && done.error ) {
        return reject( done.message || errMsg );
    }

    // `user_settings`
    columns = [
        '`userId` BIGINT(20) NOT NULL PRIMARY KEY',
        '`name` VARCHAR(50) NOT NULL',
        '`value` LONGTEXT',
        'Index (`userId`, `name`)'
    ];

    if ( isMongo ) {
        columns = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['userId', 'name'],
                    properties: {
                        userId: {
                            bsonType: 'int'
                        },
                        name: {
                            bsonType: 'string',
                            maximum: 50
                        },
                        value: {
                            bsonType: 'string'
                        }
                    }
                }
            }
        };

        indexes = ['userId', 'name'];
    }

    done = await dbManager.execQuery('user_settings').createTable( columns, indexes ).catch(errorHandler);
    if ( ! done || done.error ) {
        return reject( done.message || errMsg );
    }

    // `user_group`
    columns = [
        '`ID` BIGINT(20) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT',
        '`name` VARCHAR(50) NOT NULL UNIQUE',
        '`caps` LONGTEXT',
        'Index (`ID`, `name`)'
    ];

    if ( isMongo ) {
        columns = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name'],
                    properties: {
                        name: {
                            bsonType: 'string',
                            maximum: 60
                        },
                        caps: {
                            bsonType: 'object'
                        }
                    }
                }
            }
        };

        indexes = ['ID', 'name'];
    }

    done = await dbManager.execQuery('user_group').createTable( columns, indexes ).catch(errorHandler);
    if ( ! done || done.error ) {
        return reject( done.message || errMsg );
    }

    // `settings`
    columns = [
        '`name` VARCHAR(60) NOT NULL PRIMARY KEY',
        '`value` LONGTEXT',
        'Index (`name`)'
    ];

    if ( isMongo ) {
        columns = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name'],
                    properties: {
                        name: {
                            bsonType: 'string',
                            maximum: 60
                        },
                        value: {
                            bsonType: 'string'
                        }
                    }
                }
            }
        };
        indexes = ['name'];
    }

    done = await dbManager.execQuery('settings').createTable( columns, indexes ).catch(errorHandler);
    if ( ! done || done.error ) {
        return reject( done.message || errMsg );
    }

    // `presets`
    columns = [
        '`ID` BIGINT(20) NOT NULL PRIMARY KEY AUTO_INCREMENT',
        '`name` VARCHAR(60) NOT NULL UNIQUE',
        '`type` ENUM ("component", "module", "menu") DEFAULT "component"',
        '`location` VARCHAR(100) NOT NULL',
        '`contentType` VARCHAR(60) NOT NULL DEFAULT "global"',
        '`properties` LONGTEXT',
        '`modules` LONGTEXT',
        '`menu` LONGTEXT',
        'Index (`ID`, `name`, `type`)'
    ];

    if ( isMongo ) {
        columns = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name', 'type', 'location'],
                    properties: {
                        name: {
                            bsonType: 'string',
                            maximum: 60
                        },
                        type: {
                            bsonType: 'enum',
                            enum: ['template', 'module', 'menu'],
                            default: 'template'
                        },
                        location: {
                            bsonType: 'string',
                            maximum: 100
                        },
                        contentType: {
                            bsonType: 'string',
                            maximum: 60
                        },
                        properties: {
                            bsonType: 'object'
                        },
                        modules: {
                            bsonType: 'object'
                        },
                        menu: {
                            bsonType: 'object'
                        }
                    }
                }
            }
        };

        indexes = ['ID', 'name', 'type'];
    }

    done = await dbManager.execQuery('presets').createTable( columns, indexes ).catch(errorHandler);
    if ( ! done || done.error ) {
        return reject( done.message || errMsg );
    }

    // `content_types`
    columns = [
        '`ID` BIGINT(20) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT',
        '`name` VARCHAR(60) NOT NULL UNIQUE',
        '`description` VARCHAR(255)',
        '`status` ENUM ("active", "inactive") DEFAULT "active"',
        '`public` SMALLINT(1)',
        '`hierarchical` SMALLINT(1)',
        '`hasCategories` SMALLINT(1)',
        '`hasTags` SMALLINT(1)',
        '`hasArchive` SMALLINT(1)',
        '`hasPage` SMALLINT(1)',
        '`hasComments` SMALLINT(1)',
        '`hasThumbnail` SMALLINT(1)',
        '`commentStatus` SMALLINT(1)',
        '`archiveTemplate` BIGINT(20)',
        '`categoryTemplate` BIGINT(20)',
        '`tagTemplate` BIGINT(20)',
        '`slug` VARCHAR(255) NOT NULL UNIQUE',
        '`fields` VARCHAR(255)',
        '`settings` LONGTEXT',
        'Index (`ID`, `slug`, `status`)'
    ];

    if ( isMongo ) {
        columns = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['name', 'slug', 'fields', 'settings'],
                    properties: {
                        ID: {
                            bsonType: 'int'
                        },
                        name: {
                            bsonType: 'string',
                            maximum: 60
                        },
                        description: {
                            bsonType: 'string',
                            maximum: 255
                        },
                        status: {
                            bsonType: 'enum',
                            enum: ['active', 'inactive'],
                            default: 'active'
                        },
                        public: {
                            bsonType: 'bool'
                        },
                        hasCategories: {
                            bsonType: 'bool'
                        },
                        hasTags: {
                            bsonType: 'bool'
                        },
                        hasArchive: {
                            bsonType: 'bool'
                        },
                        hasPage: {
                            bsonType: 'bool'
                        },
                        hasThumbnail: {
                            bsonType: 'bool'
                        },
                        archiveTemplate: {
                            bsonType: 'int'
                        },
                        categoryTemplate: {
                            bsonType: 'int'
                        },
                        tagTemplate: {
                            bsonType: 'int'
                        },
                        slug: {
                            bsonType: 'string'
                        },
                        fields: {
                            bsonType: 'array'
                        },
                        settings: {
                            bsonType: 'object'
                        }
                    }
                }
            }
        };
        indexes = ['ID', 'slug', 'status'];
    }

    done = await dbManager.execQuery('content_types').createTable( columns, indexes ).catch(errorHandler);
    if ( ! done || done.error ) {
        return reject( done.message || errMsg );
    }

    return resolve(true);
};

class InstallRoutes {
    constructor(router) {
        if ( ! router ) {
            return;
        }

        this.router = router;
        router.setView( '/', this.dbSetup );
        router.get( '/db/:database', this.setDatabase.bind(this) );

        router.setView( '/setup', this.appSetup );
        router.post( '/setup', this.validateSetup.bind(this) );
    }

    dbSetup() {
        let response = {
            title: il8n('Database Selection'),
            description: il8n('A NodeJs open source framework for web and mobile application.'),
            templateNow: 'SelectDatabase',
            typeNow: 'install',
            databaseOptions: {
                mysql: il8n('The world most popular open source database.'),
                mongodb: il8n('An scallable, flexible document model database.')
            }
        };

        return response;
    }

    setDatabase( req, res ) {
        let database = req.params.database;

        Cache.set( 'database', 'db', database );

        res.redirect( '/setup' );
    }

    appSetup() {
        let response = {
            title: il8n('Configuration'),
            templateNow: 'AppSetup',
            database: Cache.get( 'database', 'db' ),
            current: 'database',
            typeNow: 'install'
        };

        return response;
    }

    async validateSetup( req, res, next ) {
        let type = _.stripSlashes($_POST.type),
            database = Cache.get( 'database', 'db' ),
            response = {};

        if ( ! database ) {
            database = 'mysql'; // Default is mysql
        }

        let config;
        let required = ['appName', 'display', 'email', 'pass'];

        switch(database) {
            default : // Default is MySQL
                config = ['host', 'dbPort', 'dbName', 'dbUser', 'dbPass', 'prefix'];
                required = required.concat(['dbName', 'dbUser', 'dbPass']);

                break;

            case 'mongodb' :
                config = ['host', 'dbPort', 'dbName', 'dbUser', 'dbPass', 'prefix'];

                break;
        }

        let reqValues = _.pick( $_POST, required ),
            values = _.stripNull( _.values(reqValues) );

        if ( values.length !== required.length ) {
            response.error = true;
            response.message = il8n('Missing required field(s).');

            return response;
        }

        config = _.stripSlashes( _.pick( $_POST, config ) );
        if ( ! config.host ) {
            config.host = 'localhost';
        }
        config.database = database;

        response = await this.createConfiguration( database, config );

        if ( response.success ) {
            response = await this.installTables();
        }

        if ( response.success ) {
            response = await this.setConfig();
        }

        if ( ! this.router ) {
            return response;
        }

        let callback = this.router.callback( () => {
            let setup = this.appSetup();

            setup.current = type;

            if ( response.error ) {
                setup.error = response.message;
            }

            setup.$_POST = $_POST;

            return setup;
        } );

        return callback( req, res, next );
    }

    async createConfiguration( database, config ) {

        global.dbManager = DatabaseManager(config);

        let verify = await dbManager.checkConnection().catch(errorHandler),
            response = {};

        if ( ! verify || verify.error ) {
            response.error = true;
            response.message = verify.message || il8n('Incorrect user and/or password.');

            return response;
        }

        let configData = `
         /**
    The name of the database type use. Default is \`mysql\`
    **/
    database: '${database}',
    /**
    The database host use to establish a connection. Default is \`localhost\`
    **/
    dbHost: '${config.host || "localhost"}',
    /**
    The name of the database to install the tables to.
    **/
    dbName: '${config.dbName}',
    /**
    The username use to authenticate when establishing connection.
    **/
    dbUser: '${config.dbUser}',
    /**
    The password use to verify during authentication process.
    **/
    dbPass: '${config.dbPass}',`;

        configData += `
    /**
    If omitted, will use \`cjs_\` as default table prefix.
    **/
    prefix: '${config.prefix||"cjs_"}',
    debug: false
    `;

        configData = `module.exports = {${configData}};`;
        let filename = path.resolve( ABSPATH, './config.js' ),
            done = await writeFile( filename, configData );

        if ( ! done || done.error ) {
            response.status = 'not_writable';
        }

        response.success = true;
        response.message = il8n('Database configuration verified.');
        response.appConfig = configData;

        return response;
    }

    async installTables() {
        let response = {};

        let done = await createTables().catch(errorHandler);

        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to install tables.');

            return response;
        }

        response.success = true;
        response.message = il8n('Tables successfully installed.');

        return response;
    }

    async setConfig() {
        let app = ['appName', 'tagline', 'userType'],
            admin = ['display', 'email', 'pass'],
            response = {};

        // Set default user group
        let groupId = await addUserGroup( {name: 'Subscriber'} ).catch(errorHandler);
        if ( ! groupId || groupId.error ) {
            response.error = true;
            response.message = groupId.message || il8n('Something went wrong. Unable to set default user group.');

            return response;
        }

        // Set app config
        app = _.stripSlashes(app);
        app.defaultGroup = groupId;

        if ( ! app.userType ) {
            app.userType = 'single';
        }

        let done = await updateAppSetting(app).catch(errorHandler);
        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to update settings.');

            return response;
        }

        // Add administrator
        admin = _.stripSlashes( _.pick( $_POST, admin ) );
        admin.group = 'administrator';

        done = await addUser(admin).catch(errorHandler);

        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to add user.');

            return response;
        }

        // Set default content types
        await addContentType({
            name: il8n('Pages'),
            slug: 'pages',
            public: true,
            hierarchical: true,
            status: 'active',
            hasPage: true,
            hasComments: true
        }).catch(errorHandler);

        await addContentType({
            name: il8n('Blog'),
            slug: 'blog',
            status: 'active',
            public: true,
            hierarchical: true,
            hasCategories: true,
            hasTags: true,
            hasComments: true,
            hasArchive: true,
            hasPage: true,
            settings: {
                itemsPerPage: 20,
                prefixByCategory: true
            }
        }).catch(errorHandler);

        await setSetting( '__intro', true ).catch(errorHandler);

        response.success = true;
        response.message = il8n('Setup completed.');

        return response;
    }
}
module.exports = app => {
    return new InstallRoutes(app);
};