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
        let getOld = (name, collection) => {
            return new Promise( (res, rej) => {
                collection.findOne({name: name}, (err, results) => {
                    if(err) {
                        rej(err);
                    }

                    res(results);
                });
            });
        };

        let update = (collection, client) => {
            return new Promise( (res, rej) => {
                collection.updateOne({name: name}, {$set: {value: value}}, (err, results) => {
                    client.close();

                    if (err) {
                        rej(err);
                    }

                    res(results);
                });
            });
        };

        let insert = (collection, client) => {
            return new Promise( (res, rej) => {
                collection.insertOne({name: name, value: value}, (err, results) => {
                    client.close();

                    if(err) {
                        rej(err);
                    }

                    res(results);
                });
            });
        };

        let upsert = async ({db, collection, client}) => {
            let oldSetting = await getOld( name, collection ).catch(errorHandler);

            if ( oldSetting && oldSetting.error ) {
                client.close();

                return reject( il8n('Unexpected error occurred.') );
            }

            if ( oldSetting && oldSetting.value ) {
                return update(collection, client);
            }

            return insert(collection, client);
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