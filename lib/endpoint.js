'use strict';

const _ = require('./mixin'),
    Cache = require('./cache');

const routeQuery = db => {
    if ( ! db ) {
        db = dbManager;
    }

    let Query = db.execQuery('endpoint');

    switch ( Query.type ) {
        default :
            return require('./db/mysql/user')(db);

        case 'mongodb' :
            return require('./db/mongodb/user')(db);
    }
};

const setEndPoint = (endPoint, value, old) => {
    if ( ! endPoint || ! value ) {
        return reject( il8n('Required arguments not defined.') );
    }

    return routeQuery().set( endPoint, value, old )
        .then( () => {
            if ( old ) {
                Cache.clear( 'endPoint', old );
            }

            Cache.set( 'endPoint', endPoint, value );
        });
};
setGlobalVar( 'setEndPoint', setEndPoint );

const getEndPoint = endPoint => {
    if ( ! endPoint ) {
        return reject( il8n('No endpoint name.') );
    }

    let cache = Cache.get( 'endPoint', endPoint );
    if ( cache ) {
        return resolve(cache);
    }

    return routeQuery().get(endPoint)
        .then( value => {
            if ( ! value ) {
                return false;
            }

            Cache.set( 'endPoint', endPoint, value );

            return value;
        });
};
setGlobalVar( 'getEndPoint', getEndPoint );

const deleteEndPoint = endPoint => {
    if ( ! endPoint ) {
        return reject( il8n('Invalid endpoint name.') );
    }

    return routeQuery().delete(endPoint)
        .then( () => {
            Cache.clear( 'endPoint', endPoint );

            return true;
        });
};
setGlobalVar( 'deleteEndPoint', deleteEndPoint );