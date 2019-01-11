'use strict';

import React from 'react';
import {appEvent} from '../utils/hooks';
import Request from '../utils/request';
import _ from 'underscore';

if( 'undefined' === typeof window ) {
    global.window = {};
}

class PageRouter {
    constructor() {
        this.routes = {};
        this.state = {};
    }

    rebirthPage() {
        let uri = _.location();

        if ( this.routes[uri] ) {
            this.setCurrentRoute( uri, this.routes[uri] );
        }
    }

    updateBrowser(url) {
        if ( window.history && window.history.pushState ) {
            window.history.pushState(null, null, url);
        }
    }

    setCurrentRoute( route, state, pageChanged ) {
        this.routes[route] = state;

        this.updateState( state, pageChanged );
    }

    goTo(url) {
        this.updateBrowser(url);

        url = _.location();

        let params = {action: this.state.hash};

        /**
         * Trigger before changing the current page.
         *
         * @param (object) $state
         */
        appEvent.trigger( 'pageChange', this.state );

        Request({
            uri: url,
            params: params,
            cache: false
        })
            .get()
            .then( (data) => {
                if ( data.success && data.redirect ) {
                    this.goTo(data.redirect);

                    return true;
                }

                this.setCurrentRoute( url, data, true );
            })
            .catch((e) => {
                // @todo: log error
            });
    }

    getState(name, defaultState) {
        return this.state[name] || defaultState;
    }

    setState( name, value ) {
        this.state[name] = value;
    }

    currentState() {
        return this.state;
    }

    updateState( state, pageChanged ) {
        state.screen = this.state.screen;
        this.state = state;

        if ( ! pageChanged ) {
            return;
        }

        appEvent.trigger( 'pageChanged', state );
    }
}

const Router = new PageRouter();

export const setCurrentRoute = (r, s) => Router.setCurrentRoute(r, s);
export const getState = (n, d) => Router.getState(n, d);
export const setState = (n, s) => Router.setState(n, s);
export const goTo = u => Router.goTo(u);
export const currentState = () => Router.currentState();
export const updateState = state => Router.updateState(state);
export const updateBrowser = url => Router.updateBrowser(url);