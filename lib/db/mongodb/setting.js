'use strict';

class SettingQuery {
    constructor(db) {
        this.dbManager = db.execQuery('settings');
    }

    getSetting(name) {
        let filter = {name: name},
            options = {projection: {value: 1}};

        return this.dbManager.get( filter, options );
    }

    setSetting( name, value ) {
        
        let upsert = async ({db, collection, client}) => {
            let oldSetting = await collection.findOne({name: name}).catch(errorHandler);
            if ( oldSetting && oldSetting.error ) {
                client.close();

                return reject( il8n('Unexpected error occurred.') );
            }

            if ( oldSetting && oldSetting.value ) {
                return collection.updateOne({name: name}, {$set: {value: value}})
                    .then( results => {
                        client.close();

                        return results;
                    })
                    .catch( err => {
                        client.close();

                        return err;
                    });
            }

            return collection.insertOne({name: name, value: value})
                .then( results => {
                    client.close();

                    return results;
                })
                .catch( err => {
                    client.close();

                    return err;
                });
        };

        return this.dbManager.query().then(upsert);
    }

    deleteSetting(name) {
        let filter = {name: name};

        return this.dbManager.delete(filter);
    }
}
module.exports = db => {
    return new SettingQuery(db);
};