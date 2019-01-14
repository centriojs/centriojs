'use strict';

class EndPointQuery {
    constructor(db) {
        this.dbManager = db.execQuery('endpoint');
    }

    get(endPoint) {
        let sql = 'SELECT `value` FROM ?? WHERE `endpoint` = ?',
            format = [this.dbManager.table, endPoint];

        return this.dbManager.get( sql, format )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                let result = results.shift();

                return unserialize(result.value);
            });
    }

    set( endPoint, value, old ) {
        let columns = {
            endpoint: endPoint,
            value: serialize(value)
        };

        if ( old ) {
            let filter = ['`endpoint` = ?'],
                format = [old];

            return this.dbManager.update( filter, columns, format );
        }

        return this.dbManager.insert(columns);
    }

    delete(endPoint) {
        let filter = ['`endpoint` = ?'],
            format = [endPoint];

        return this.dbManager.delete( filter, format );
    }
}
module.exports = db => {
    return new EndPointQuery(db);
};