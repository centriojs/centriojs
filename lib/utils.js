'use strict';

const _ = require('./mixin');

/**
 * Helper function to add non-writable global variable.
 *
 * @param name
 * @param value
 * @returns {boolean}
 */
const setGlobalVar = (name, value) => {
    if ( global[name] ) {
        // Don't override global variables
        return false;
    }

    Object.defineProperty( global, name, {
        value: value,
        writable: false
    } );
};
Object.defineProperty( global, 'setGlobalVar', {
    value: setGlobalVar,
    writable: false
});

/**
 * Helper function that is usually use in a promise base to return true.
 *
 * @returns {boolean}
 * @private
 */
const _returnTrue = () => {
    return true;
};
setGlobalVar( 'returnTrue', _returnTrue );

/**
 * Helper function that is usually use in a promise base to return false.
 *
 * @returns {boolean}
 * @private
 */
const _returnFalse = () => {
    return false;
};
setGlobalVar( 'returnFalse', _returnFalse );

/**
 * Helper function to return a resolve promise.
 *
 * @param response
 * @returns {Promise<any>}
 * @private
 */
const _resolve = response => {
    return Promise.resolve(response);
};
setGlobalVar( 'resolve', _resolve );

/**
 * Helper function to return a rejected promise.
 *
 * @param response
 * @returns {Promise<never>}
 * @private
 */
const _reject = response => {
    return Promise.reject(response);
};
setGlobalVar( 'reject', _reject );

/**
 * Translate the given text string into current language use.
 *
 * @param str
 * @returns {*}
 * @private
 */
const _il8n = str => {
    return str;
};
setGlobalVar( 'il8n', _il8n );

/**
 * Serialize the given value if it is of object or array type.
 *
 * @param value
 * @returns {*}
 */
const _serialize = value => {
    if ( ! value ) {
        return value;
    }

    if ( 'string' === typeof value ) {
        return value;
    }

    return JSON.stringify(value);
};
setGlobalVar( 'serialize', _serialize );

/**
 * Unserialize the value that was previously serialized.
 *
 * @param value
 * @returns {*}
 */
const _unserialize = value => {
    if ( ! value ) {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch(e) {
        return value;
    }
};
setGlobalVar( 'unserialize', _unserialize );

/**
 * Helper function to handle error responses.
 *
 * @param error
 * @returns {{error: boolean, message: (*|string)}}
 * @private
 */
const _errorHandler = error => {
    let message = '';

    if ( 'string' === typeof error ) {
        message = error;
    } else if ( error.sqlMessage ) {
        message = error.sqlMessage;
    } else if ( error.message ) {
        message = error.message;
    } else {
        message = il8n('An unknown error occur.');
    }

    return {
        error: true,
        message: message
    };
};
setGlobalVar( 'errorHandler', _errorHandler );

const _promise = callback => {
    return new Promise(callback);
};
setGlobalVar( 'promise', _promise );

const generateKey = obj => {
    let keys = [];

    _.values(obj).map( val => {
        if ( _.isObject(val) ) {
            return false;
        }

        if ( _.isArray(val) ) {
            keys = keys.concat(val);
        } else {
            keys.push(val);
        }
    });

    return keys.join('-');
};
setGlobalVar( 'generateKey', generateKey );

const Hooks = {};

/**
 * Sets an actionable or callable function/method that gets executed at a certain event.
 *
 * @param {string} name             An action or filter name that is use as key to execute the event.
 * @param {function} callback       Required. The callable function to execute at certain event.
 * @param {int} $priority           Optional. The priority number at assigned that is use for execution order.
 * @param {string} $uniq            Optional. A unique identifier for the hook. If omitted, will use the function name instead.
 * @returns {boolean}
 */
const addHook = function(name, callback) {
    let priority = arguments[2] || 0,
        uniq = arguments[3] || callback.name,
        once = arguments[4] || false;

    if ( ! uniq ) {
        return false;
    }

    let hooks = Hooks[name] || {};
    hooks[uniq] = {
        key: uniq,
        callback: callback,
        priority: priority,
        once: once
    };

    Hooks[name] = hooks;
};

/**
 * Remove hook from the list.
 *
 * @param {string} name         The custom hook name use to execute callable functions or methods.
 * @param {string} uniq         The unique identifier or function/method name that was use previously.
 * @returns {boolean}
 */
const removeHook = function(name, uniq) {
    if ( ! Hooks[name] ) {
        return false;
    }

    let hooks = Hooks[name];
    if ( ! hooks[uniq] ) {
        return false;
    }

    delete hooks[uniq];

    Hooks[name] = hooks;
};

/**
 * Check if the given actionable name contains executable functions.
 *
 * @param {string} name
 * @returns {boolean}
 */
const hasHook = name => {
    return !! Hooks[name];
};

const appEvent = {
    on: addHook,
    off: removeHook,
    has: hasHook,
    trigger: async function(name) {
        if ( ! hasHook(name) ) {
            return false;
        }

        let hooks = Hooks[name],
            args = _.values(arguments).slice(1);

        hooks = _.sortBy( hooks, 'priority' );

        for ( let i = 0; i < hooks.length; i++ ) {
            let callback = hooks[i].callback;

            await callback.apply( callback, args );

            if ( hooks[i].once ) {
                // If it's meant to be called only once, delete the hook
                delete Hooks[name][hooks[i].key];
            }
        }

        return true;
    }
};
setGlobalVar( 'appEvent', appEvent );

const Filter = {
    on: addHook,
    off: removeHook,
    has: hasHook,
    apply: async function(name, value) {
        if ( ! hasHook(name) ) {
            return value;
        }

        let hooks = Hooks[name],
            args = _.values(arguments).slice(2);

        hooks = _.sortBy( hooks, 'priority' );

        for ( let i = 0; i < hooks.length; i++ ) {
            let callback = hooks[i].callback,
                _args = [value].concat(args);

            value = await callback.apply( callback, _args );

            if ( hooks[i].once ) {
                // If it's meant to be called only once, delete the hook
                delete Hooks[name][hooks[i].key];
            }
        }

        return value;
    }
};
setGlobalVar( 'Filter', Filter );