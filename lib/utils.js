'use strict';

/**
 * Helper function that is usually use in a promise base to return true.
 *
 * @returns {boolean}
 * @private
 */
const _returnTrue = () => {
    return true;
};
global.returnTrue = _returnTrue;

const _returnFalse = () => {
    return false;
};
Object.defineProperty(global, 'returnFalse', {
    value: _returnFalse,
    writable: false
});

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
global.resolve = _resolve;

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
global.reject = _reject;

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
global.il8n = _il8n;

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
global.serialize = _serialize;

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
global.unserialize = _unserialize;

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
global.errorHandler = _errorHandler;