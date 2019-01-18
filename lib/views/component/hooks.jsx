'use strict';

import _ from "underscore";

const Hooks = {};

/**
* Adds a callback function to a given hook name.
*
* @param {string} name          The name of an action hook that is use to trigger and execute the attached callable
 *                              functions or methods.
* @param {function} cb
* @param {int} priority         Optional.
* @param {string} key           Optional. A unique identifier use to identify the attached callable function. Useful
 *                              for un-named function format.
* @param {boolean} once         If true, the attached will only called once.
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

/**
 * Remove the attached callable function from the list of executables.
 *
 * @param {string} name
 * @param {any}key
 */
const removeHook = function(name, key) {
    if ( ! Hooks[name] || ! Hooks[name][key] ) {
        return;
    }

    delete Hooks[name][key];
};

/**
 * Check whether the given an actionable has attached callbacks.
 *
 * @param {string} name
 * @returns {boolean}
 */
const hasHook = name => {
    return !! Hooks[name];
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

export const Filter = {
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

export const Component = {
    on: addHook,
    off: removeHook,
    hasComponent: hasHook,
    render: function(name) {
        if ( ! Hooks[name] ) {
            return null;
        }

        let args = _.values(arguments).slice(1),
            filters = Hooks[name],
            callbacks = [];

        filters = _.sortBy( filters, 'priority' );

        _.each(filters, (filter) => {
            callbacks.push( filter.cb );
        });

        let values = [];

        for( let i = 0; i < callbacks.length; i++ ) {
            let cb = callbacks[i];

            let value = cb.apply( cb, args );

            values.push(value);
        }

        return values;
    }
};