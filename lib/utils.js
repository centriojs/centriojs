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