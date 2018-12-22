'use strict';

const assert = require('chai').assert,
    _ = require('underscore');

require('../../lib/load');

const {DatabaseManager} = require('../../lib/db');

let config = {
    database: 'mysql',
    dbName: 'centriojs_test',
    dbUser: 'root',
    dbPass: 'root',
    secretKey: '52071d25e7ec91dd36bdd5166f01659f'
};

global.dbManager = DatabaseManager(config);

describe('MySQL preset queries', () => {
    let id;

    it('Should add new preset', done => {
        addPreset({
            name: 'Test 1',
            type: 'template',
            location: 'default'
        })
            .then( ok => {
                id = ok;
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should update the newly inserted preset', done => {
        updatePreset({
            ID: id,
            properties: {
                seo: {title: 'SEO'}
            }
        })
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should get the newly updated preset', done => {
        getPreset(id)
            .then( preset => {
                assert.isObject( preset, true );
                done();
            })
            .catch(done);
    });

    it('Should delete the recently updated preset', done => {
        deletePreset(id)
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should get presets base on location', async () => {
        await addPreset({
            name: 'Preset 1',
            type: 'template',
            location: 'with-left-sidebar'
        }).catch(returnFalse);

        await addPreset({
            name: 'Preset 2',
            type: 'module',
            location: 'left-sidebar'
        }).catch(returnFalse);

        await addPreset({
            name: 'Preset 3',
            type: 'menu',
            location: 'primary'
        }).catch(returnFalse);

        return getPresets({type: 'template'})
            .then( results => {
                let notMatch = false;

                results.map( preset => {
                    if ( 'template' !== preset.type ) {
                        notMatch = true;
                    }
                });

                return assert.isFalse( notMatch, true );
            });
    });

    it('Should get presets where type in template, menu', done => {
        getPresets({
            type__in: ['template', 'menu']
        })
            .then( results => {
                let hasOthers = false;

                results.map( result => {
                    if ( 'template' !== result.type && 'menu' !== result.type ) {
                        hasOthers = true;
                    }
                });

                assert.isFalse( hasOthers, true );

                done();
            })
            .catch(done);
    });

    it('Should close database connection', done => {
        dbManager.close();
        done();
    });
});