'use strict';

import _ from 'underscore';
import axios from 'axios';
import {getState} from "./router";

const Cache = {};

class Request {
    constructor(options) {
        this.options = _.extend({
            cache: true,
            uri: '',
            params: {}
        }, options);
        this.params = this.options.params;

        this.instance = axios.create({
            baseURL: _.hostUrl(),
            headers: this.getHeaders()
        });

        this.cancelToken = axios.CancelToken;
        this.cancelSource = false;
        this.cancelRequest = this.cancelRequest.bind(this);
        this.validateResponse = this.validateResponse.bind(this);
    }

    getHeaders() {
        let headers = {
            'X-CJS-NONCE': getState('hash')
        };

        if ( this.options.headers ) {
            headers = _.extend( headers, this.options.headers );
        }

        return headers;
    }

    addParam( key, value ) {
        this.params[key] = value;

        return this.params;
    }

    removeParam( key ) {
        if ( this.params[key] ) {
            delete this.params[key];
        }

        return this.params;
    }

    validateResponse(response) {
        let headers = response.headers,
            data = response.data;

        // Clear cancel source
        this.cancelSource = false;
        // todo: do validation here

        if ( this.options.cache ) {
            let key = this.requestKey();
            Cache[key] = data;
        }

        return data;
    }

    requestKey() {
        let uri = this.options.uri,
            params = this.options.params;

        return uri + JSON.stringify(params);
    }

    cancelRequest() {
        if ( this.cancelSource ) {
            return false;
        }

        this.cancelSource();
    }

    getUrl() {
        return this.options.uri;
    }

    get() {
        let uri = this.getUrl(),
            params = this.options.params;

        let key = this.requestKey();
        if ( this.options.cache && Cache[key] ) {
            return _.resolve(Cache[key]);
        }

        return this.instance.get( uri, {
            params: params,
            cancelToken: new this.cancelToken( cancel => {
                this.cancelSource = cancel;
            })
        }).then(this.validateResponse);
    }

    post() {
        let key = this.requestKey();

        if ( this.options.cache && Cache[key] ) {
            return _.resolve(Cache[key]);
        }

        return this.instance.post( this.options.uri, this.params, {
            cancelToken: new this.cancelToken( cancel => {
                this.cancelSource = cancel;
            })
        } ).then(this.validateResponse);
    }
}
module.exports = options => {
    return new Request(options);
};