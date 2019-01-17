'use strict';

const _ = require('../mixin');

// Listen to user deletion
const deletedUser = userId => {
    // Delete activities
    deleteUserActivity(userId).catch(errorHandler);

    // @todo: handle contents where user is the author

    // Delete settings
    deleteUserSetting(userId).catch(errorHandler);

    return true;
};
appEvent.on( 'deletedUser', deletedUser );