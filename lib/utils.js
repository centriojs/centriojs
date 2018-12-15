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