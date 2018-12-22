'use strict';

class SettingQuery {
    constructor(db) {
        this.dbManager = db.execQuery('settings');
    }

    getSetting(name) {
        let sql = 'SELECT * FROM ?? WHERE `name` = ?',
            format = [this.dbManager.table, name];

        return this.dbManager.get( sql, format );
    }

    async setSetting( name, value ) {
        let oldSetting = await this.getSetting(name).catch(returnFalse);

        if ( oldSetting && oldSetting.length ) {
            return this.dbManager.update(['`name` = ?'], {value:value}, [name] );
        }

        return this.dbManager.insert({name: name, value: value});
    }

    deleteSetting(name) {
        let filter = ['`name` = ?'],
            format = [name];

        return this.dbManager.delete( filter, format );
    }
}
module.exports = db => {
    return new SettingQuery(db);
};