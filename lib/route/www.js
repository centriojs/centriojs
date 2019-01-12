'use strict';

const _ = require('../mixin'),
    vm = require('vm');

class Router {
    constructor(router) {
        this.router = router;
    }

    get() {
        return this.router.get.apply( this.router, arguments );
    }

    post() {
        this.router.post.apply( this.router, arguments );
    }

    use() {
        return this.router.use.apply( this.router, arguments );
    }

    callback(cb) {
        return async (req, res, next) => {
            let response = cb( req.param, req, res );

            response.pageTitle = await Filter.apply( 'pageTitle', response.title, response );
            response.pageDescription = await Filter.apply( 'pageDescription', response.description, response );

            response.bodyClass = [];
            response.body = req.path;

            if ( global.dbManager && dbManager.conn ) {
                dbManager.close();
            }

            let html = this.printHTML(response);
            res.send(html);
        };
    }

    setView( route, callback ) {
        this.router.get( route, this.callback(callback) );
    }

    error( title, message) {
        return this.callback( () => {
            let response = {
                title: il8n(title),
                typeNow: 'Alert',
                type: 'error',
                message: message
            };

            return response;
        });
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