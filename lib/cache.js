'use strict';

let Cached = {};

class Cache {
    set( group, key, value ) {
        let groups = Cached[group] || {};

        groups[key] = value;
        Cached[group] = groups;
    }

    get( group, key ) {
        if ( ! Cached[group] || ! Cached[group][key] ) {
            return undefined;
        }

        return Cached[group][key];
    }

    clear( group, key ) {
        if ( ! Cached[group] || ! Cached[group][key] ) {
            return;
        }

        delete Cached[group][key];
    }

    clearGroup( group ) {
        if ( ! Cached[group] ) {
            return;
        }

        Cache[group] = false;
    }

    clearAll() {
        Cached = {};
    }
}

module.exports = new Cache();