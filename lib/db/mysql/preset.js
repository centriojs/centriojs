'use strict';

class PresetQuery {
    constructor(db) {
        this.dbManager = db.execQuery('presets');
    }

    insert(preset) {
        let {properties, modules, menu} = preset;

        if ( properties ) {
            preset.properties = serialize(properties);
        }

        if ( modules ) {
            preset.modules = serialize(modules);
        }

        if ( menu ) {
            preset.menu = serialize(menu);
        }

        return this.dbManager.insert(preset)
            .then( results => {
                return results.insertId;
            });
    }

    update(preset) {
        let filter = ['`ID` = ?'],
            format = [preset.ID];

        return this.dbManager.update( filter, preset, format );
    }

    delete(ID) {
        let filter = ['`ID` = ?'],
            format = [ID];

        return this.dbManager.delete(filter, format);
    }

    get(ID) {
        let sql = 'SELECT * FROM ?? WHERE `ID` = ?',
            format = [this.dbManager.table, ID];

        return this.dbManager.get( sql, format )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                let preset = results.shift();

                if ( preset.properties ) {
                    preset.properties = unserialize(preset.properties);
                }

                if ( preset.modules ) {
                    preset.modules = unserialize(preset.modules);
                }

                if ( preset.menu ) {
                    preset.menu = unserialize(preset.menu);
                }

                return preset;
            });
    }

    query(query) {
        let sql = 'SELECT * FROM ??',
            where = [],
            format = [this.dbManager.table];

        let {type, type__in} = query;
        if ( type ) {
            where.push('`type` = ?');
            format.push(type);
        } else if ( type__in ) {
            where.push('`type` IN (?)');
            format.push(type__in);
        }

        let {location, location__in} = query;
        if ( location ) {
            where.push('`location` = ?');
            format.push(location);
        } else if ( location__in ) {
            where.push('`location` IN (?)');
            format.push(location__in);
        }

        let {contentType, contentType__in} = query;
        if ( contentType ) {
            where.push('`contentType` = ?');
            format.push(contentType);
        } else if ( contentType__in ) {
            where.push('`contentType` IN (?)');
            format.push(contentType__in);
        }

        if ( where.length ) {
            sql += ' WHERE ' + where.join(' AND ');
        }

        let {page, perPage} = query;
        page = page || 1;

        if ( perPage > 0 ) {
            let offset = page * perPage - perPage;

            sql += ` LIMIT ${offset}, ${perPage}`;
        }

        return this.dbManager.get( sql, format )
            .then( results => {
                if ( ! results.length ) {
                    return false;
                }

                let presets = [];

                results.map( preset => {
                    if ( preset.properties ) {
                        preset.properties = unserialize(preset.properties);
                    }

                    if ( preset.modules ) {
                        preset.modules = unserialize(preset.modules);
                    }

                    if ( preset.menu ) {
                        preset.menu = unserialize(preset.menu);
                    }

                    presets.push(preset);
                });

                return presets;
            });
    }
}
module.exports = db => {
    return new PresetQuery(db);
};