'use strict';

const _ = require('../mixin'),
    uaParser = require('ua-parser-js'),
    {encrypt, decrypt} = require('../encrypt'),
    vm = require('vm');

class Router {
    constructor(router) {
        this.req = false;
        this.res = false;
        this.router = router;
        this.isAdmin = false;
        this.browser = false;
        this.device = false;

        router.use( this.init.bind(this) );
    }

    isVerified() {
        return $_COOKIE && $_COOKIE.__cjs__ && $_COOKIE.__cjs__ === this.keys.auth;
    }

    verifyRequest( name, hash ) {
        return decrypt(hash)
            .then( str => {
                if ( str === name ) {
                    return true;
                }

                return false;
            })
            .catch( err => {
                errorHandler(err);

                return false;
            });
    }

    async init( req, res, next ) {
        this.req = req;
        this.res = res;
        const ua = uaParser(req.headers['user-agent']);

        this.browser = ua.browser;
        this.device = ua.device;

        // Get or generate keys
        let keys = await getSetting('__keys').catch(errorHandler);
        const time = Date.now(),
            interval = 86400 * 60000;

        if ( ! keys || keys.error || keys.time <= time ) {
            // Generate keys
            keys = {
                auth: randomSalt(16, 15, 'hex'),
                login: randomSalt(16, 15, 'hex'),
                time: time + (interval * 30) // Save the keys for 30 days
            };

            await setSetting( '__keys', keys ).catch(errorHandler);
        }

        this.keys = keys;

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

        // Listen to login/logout validation submission
        if ( ! isUserLoggedIn() ) {
            this.router.post( req.path, this.validateLogin.bind(this) );
        } else {
            this.setGetResponse( '/logout', this.logout.bind(this), true );
        }

        return next();
    }

    setCookie( {name, value, expires, cookiePath, cookieDomain, isSSl, httpOnly, sameSite}, res ) {
        let args = {
            maxAge: expires,
            path: cookiePath || COOKIEPATH,
            domain: cookieDomain || COOKIEDOMAIN,
            httpOnly: httpOnly,
            secure: isSSl,
            sameSite: sameSite || true
        };

        if ( ! res ) {
            res = this.res;
        }

        try {
            return res.cookie(name, value, args);
        } catch(e) {
            return false;
        }
    }

    clearCookie(name) {
        return this.setCookie({
            name: name,
            value: -1,
            expires: -1
        });
    }

    get() {
        return this.router.get.apply( this.router, arguments );
    }

    setGetResponse( route, callback ) {
        let requireLogin = arguments[2] || false,
            userCap = arguments[3] || false;

        return this.router.get( route, ( req, res, next) => {
            let response = {};

            if ( requireLogin && ! isUserLoggedIn() ) {
                response.error = true;
                response.errorType = 'requireLogin';
                response.message = il8n('You must be logged in gain access.');

                return res.json(response);
            }

            if ( userCap && isUserLoggedIn() && ! currentUserCan( userCap ) ) {
                response.error = true;
                response.errorType = 'noAccess';
                response.message = il8n('You don\'t have enough privilidge to gain access.');

                return res.json(response);
            }

            return callback( req, res, next );
        });
    }

    post() {
        this.router.post.apply( this.router, arguments );
    }

    setPostResponse( route, callback ) {
        let requireLogin = arguments[2] || false,
            userCap = arguments[3] || false;

        return this.router.post( route, ( req, res, next) => {
            let response = {};

            if ( requireLogin && ! isUserLoggedIn() ) {
                response.error = true;
                response.errorType = 'requireLogin';
                response.message = il8n('You must be logged in gain access.');

                return res.json(response);
            }

            if ( userCap && isUserLoggedIn() && ! currentUserCan( userCap ) ) {
                response.error = true;
                response.errorType = 'noAccess';
                response.message = il8n('You don\'t have enough privilidge to gain access.');

                return res.json(response);
            }

            return callback( req, res, next );
        });
    }

    use() {
        return this.router.use.apply( this.router, arguments );
    }

    async validateLogin( req, res, next ) {
        if ( ! $_COOKIE.__login__ ) {
            return next();
        }

        this.req = req;
        this.res = res;

        // Validate login request
        let verified = this.verifyRequest( this.keys.login, $_COOKIE.__login__ );
        if ( ! verified ) {
            return res.json(this.noAccess());
        }

        // Validate submission
        let email = $_POST.email,
            pass = $_POST.pwd,
            response = {};

        let callback = resp => {
            return this.callback( () => {
                let login = this.login();
                login.$_POST = $_POST;
                login = _.extend( login, resp );

                return login;
            });
        };

        let user = await validateAndLogin( email, pass ).catch(errorHandler);

        if ( ! user || user.error ) {
            response.error = true;
            response.message = user.message || il8n('Cannot verify user credential.');

            return callback(response)( req, res, next );
        }

        // Set user cookie
        await encrypt(user.email)
            .then( hash => {
                let duration = _.duration().dayInMilSeconds;

                if ( $_POST.remember ) {
                    // Remember this user for 30 days
                    duration = duration * 30;
                }

                // Save user hash in cookie
                this.setCookie({
                    name: '__usr__',
                    value: hash,
                    expires: Date.now() + duration
                });

                return true;
            })
            .catch(errorHandler);

        // Delete cookie
        this.clearCookie('__login__');

        // @todo: return json format if the request is sent via ajax
        let redirect = req.path;
        if ( this.isAdmin ) {
            redirect = '/admin' + redirect;
        }
        res.redirect(redirect);
    }

    login() {
        let response = {
            title: il8n('Login'),
            templateNow: 'LoginPage',
            typeNow: 'login'
        };

        if ( $_COOKIE.__login__ ) {
            return response;
        }

        encrypt(this.keys.login)
            .then( hash => {
                this.setCookie({
                    name: '__login__',
                    value: hash,
                    expires: Date.now() + (86400 * 6000)
                });
                return true;
            })
            .catch(errorHandler);

        return response;
    }

    logout( req, res ) {
        this.clearCookie( '__usr__' );

        // Redirect to front page
        res.redirect( '/' );
    }

    noAccess() {
        let response = {
            title: il8n('Insufficient access.'),
            templateNow: 'NoAccess',
            typeNow: 'no-access'
        };

        return response;
    }

    callback( cb ) {
        let requireLogin = arguments[1] || false,
            userCap = arguments[2] || false;

        return async ( req, res ) => {
            this.req = req;
            this.res = res;

            let response;

            if ( requireLogin && ! isUserLoggedIn() ) {
                response = this.login();
            }

            if ( userCap && isUserLoggedIn() && ! currentUserCan( userCap ) ) {
                response = this.noAccess();
            }

            if ( ! response ) {
                response = await cb( req.param, req, res );

                if ( this.isAdmin ) {
                    response.isAdmin = true;
                }
            }

            this.setCookie({
                name: '__cjs__',
                value: this.keys.auth,
                expires: Date.now() + (86400 * 60000)
            });

            /**
             * Filter the page title to allow modification before rendering.
             *
             * @param {string} pageTitle
             * @param {object} response
             * @return {string} pageTitle
             */
            let pageTitle = response.title || '';
            response.pageTitle = await Filter.apply( 'pageTitle', pageTitle, response );

            /**
             * Fired to allow setting or unsetting the document's description.
             *
             * @param {string} pageDescription
             * @param {object} response
             * @return {string} pageDescription
             */
            let pageDescription = response.description || '';
            response.pageDescription = await Filter.apply( 'pageDescription', pageDescription || '', response );

            let metaData = [];
            if ( response.description ) {
                metaData.push({
                    name: 'description',
                    value: response.pageDescription
                });
            }
            /**
             * Populate the document's meta data.
             *
             * @param {array} metaData                  An array of object where the name is the attribute of the meta
             *                                          and the value is it's corresponding value.
             * @param {object} response
             * @return {array} metaData
             */
            response.metaData = await Filter.apply( 'metaData', metaData, response );

            let bodyClass = [];
            if ( response.typeNow ) {
                bodyClass.push(response.typeNow);
            }

            /**
             * Fire to populate body classes to print in the
             * the document.
             *
             * @param {array} bodyClass
             * @param {object} response
             * @return {array} bodyClass
             */
            response.bodyClass = await Filter.apply( 'bodyClass', bodyClass, response );

            let theme = await getCurrentTheme();

            let _templates = theme.__templates || {};
            response.__templates = _templates;

            let html = this.printHTML(response);
            res.send(html);
        };
    }

    setView( route, callback ) {
        let requireLogin = arguments[2] || false,
            userCap = arguments[3] || false;

        this.router.get( route, this.callback( callback, requireLogin, userCap ) );
    }

    error( title, message ) {
        return this.callback( () => {
            return this.setError( title, message );
        });
    }

    setError( title, message ) {
        let response = {
            title: il8n(title),
            templateNow: 'Alert',
            type: 'error',
            message: message
        };

        return response;
    }

    webContent(options) {
        let web = vm.createContext({
            require: require,
            options: options,
            output: ''
        });

        vm.runInContext(`
            'use strict';
            
            require('babel-register')({
                presets: ['env', 'react', 'es2016'],
                only: ['./views/*.jsx', './views/**/*.jsx']
            });
            
            const Index = require('../views/__index');
            
            output = Index(options);
        `, web );

        return web.output;
    }

    printHTML(options) {
        let lang = options.lang || 'en',
            charset = options.charset || 'utf-8',
            bodyClass = options.bodyClass.join(' '),
            body = this.webContent(options);

        return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <title>${options.pageTitle}</title>
    <meta charset="${charset}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${this.htmlHead(options)}
</head>
<body class="${bodyClass}">
    <div id="preload" class="preload"></div>
    <div id="root">${body}</div>
</body>
</html>`;
    }

    htmlHead(options) {
        let html = [];

        if ( options.pageDescription ) {
            html.push(`<meta name="description" value="${options.pageDescription}" />`);
        }

        return html.join("\n");
    }
}
module.exports = Router;