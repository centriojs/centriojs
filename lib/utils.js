'use strict';

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