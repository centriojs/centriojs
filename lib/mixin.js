'use strict';

const _ = require('underscore');

_.mixin({
    isEmail: email => {
        let atPos = email.indexOf('@'),
            dotPos = email.indexOf('.');

        return atPos && dotPos && dotPos > (atPos+2);
    },

    sprintf: function(str) {
        let pattern = /%s|%d/g,
            formats = str.match(pattern),
            values = _.values(arguments).slice(1);

        if ( ! formats ) {
            return str;
        }

        let start = 0;
        str = str.replace( pattern, x => {
            x = values[start];
            start++;

            return x;
        });

        return str;
    },

    stripTags: ( str, exclude ) => {
        exclude = exclude || [];

        str = str.replace(/(<([^>]+)>)/ig, x => {
            if ( exclude.length && _.contains( exclude, x ) ) {
                return x;
            }

            return '';
        });

        return str;
    },

    stripNull: obj => {
        if ( _.isArray(obj) ) {
            obj = _.without( obj, [null, undefined, ''] );

            return obj;
        }

        _.each( obj, (val, key) => {
            if ( ! val ) {
                delete obj[key];
            }
        });

        return obj;
    },

    /**
     * Helper function to transform an object to an string uri query format.
     *
     * @param obj
     * @returns {string}
     */
    objToParam: obj => {
        let keys = Object.keys(obj),
            params = [];

        keys.map( key => {
            let value = obj[key];

            params.push(`${key}=${value}`);
        });

        return params.join('&');
    },

    /**
     * Add query param to the given uri string.
     *
     * @param {string} uri
     * @param {string} key
     * @param {string} value
     * @returns {string}
     */
    addQueryParam: (uri, key, value) => {
        let query = {},
            index = uri.indexOf('?'),
            baseUri = index > 0 ? uri.substr(0, index-1) : uri;

        if ( index > 0 ) {
            let q = uri.substr(index+1).split('&');

            _.each( q, param => {
                param = param.split('=');

                if ( !param[0] ) {
                    return false;
                }

                let val = param[1] || '';
                query[param[0]] = val;
            });
        }

        query[key] = value;

        return baseUri + '?' + _.objToParam(query);
    },

    routePath: path => {
        let param = path.split('/');

        return {
            add: (name, value) => {
                let found = false;

                param.map( (key, index) => {
                    if ( ! found && key === name ) {
                        param[index+1] = value;
                    }
                });

                if ( ! found ) {
                    param.push( name, value );
                }

                return param.join('/');
            },

            remove: name => {
                param.map( (key, index) => {
                    if ( key === name ) {
                        param = _.without( param, key, param[index+1] );
                    }
                });

                return param.join('/');
            }
        }
    },

    toObject: arr => {
        return _.object( arr, _.range(0, arr.length).fill(1) );
    },

    dbDateFormat: dateString => {
        if ( ! dateString ) {
            // Assume current date
            dateString = new Date().toUTCString();
        }

        return new Date(dateString);
    },

    toSlug: str => {
        return str.toLowerCase().replace(/[ '`"*&^%$#@!<>\/]/g, '-');
    }
});
module.exports = _;