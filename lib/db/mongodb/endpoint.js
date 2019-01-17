'use strict';

class EndPoint {
    constructor(db) {
        this.dbManager = db.execQuery('endpoint');
    }

    get(endpoint) {
        let filter = {endpoint: endpoint};

        return this.dbManager.get(filter)
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                return results.shift().value;
            })
    }

    set( endPoint, value, old ) {
        let columns = {
            endpoint: endPoint,
            value: value
        };

        if ( old ) {
            return this.dbManager.update({endPoint: endPoint}, {$set: columns} )
                .catch( () => {
                    return this.dbManager.insert(columns);
                });
        }

        return this.dbManager.insert(columns);
    }

    delete(endPoint) {
        let filter = {endpoint: endPoint};

        return this.dbManager.delete(filter);
    }
}
module.exports = db => {
    return new EndPoint(db);
};