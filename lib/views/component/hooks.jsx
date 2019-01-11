'use strict';

import _ from "underscore";

const Hooks = {};

/**
* Adds a callback function to a given hook name.
*
* @param {string} name
* @param {function} cb
* @param {int} priority
* @param {string} key
* @param {boolean} once        - Whether to trigger the callback hook only once.
* @returns {boolean}
*/
const addHook = function (name, cb) {
    let priority = arguments[2] || 0,
        key = arguments[3] || null,
        once = arguments[4] || false;

    if ( ! key && cb.name ) {
        key = cb.name;
    }

    if ( ! key ) {
        return false;
    }

    let hooks = Hooks[name] || {};
    priority = priority || 0;

    hooks[key] = {cb: cb, priority: priority, once: once};

    Hooks[name] = hooks;

    return true;
};

const removeHook = (name, key) => {
    if ( ! Hooks[name] || ! Hooks[name][key] ) {
        return;
    }

    delete Hooks[name][key];
};

const hasHook = name => {
    return Hooks[name];
};

const removeAllHook = name => {
    if ( ! Hooks[name] ) {
        return;
    }

    delete Hooks[name];
};

export const appEvent = {
    on: addHook,
    off: removeHook,
    hasEvent: hasHook,
    trigger: function(name) {
        let args = _.values(arguments).slice(1);

        if ( ! Hooks[name] ) {
            return args;
        }

        let actions = Hooks[name];
        actions = _.sortBy(actions, 'priority');

        _.each( actions, (action, key) => {
            let cb = action.cb;

            cb.apply( cb, args );

            if ( action.once ) {
                delete actions[key];
            }
        });
    }
};

export const filter = {
    on: addHook,
    off: removeHook,
    hasFilter: hasHook,
    apply: function(name, value) {
        if ( ! Hooks[name] ) {
            return value;
        }

        let args = _.values(arguments).slice(2),
            filters = Hooks[name],
            callbacks = [];

        filters = _.sortBy( filters, 'priority' );

        _.each(filters, (filter) => {
            callbacks.push( filter.cb );
        });

        for( let i = 0; i < callbacks.length; i++ ) {
            let cb = callbacks[i],
                _args = [value].concat(args);

            value = cb.apply( cb, _args );
        }

        return value;
    }
};