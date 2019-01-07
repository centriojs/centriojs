'use strict';

const assert = require('chai').assert,
    _ = require('../lib/mixin');

const presetRoute = require('../lib/route/preset');
global.currentUser = {ID: 1};

describe('Admin presets routes', () => {
    let presetId;

    let req = {
        param: {}
    };

    let res = {
        json: json => {
            return json;
        }
    };

    it('Should return data needed to add preset', function(done) {
        presetRoute.editPreset({})
            .then( response => {
                assert.equal( response.title, 'New Preset' );
                done();
            })
            .catch(done);
    });

    it('Should add new preset', function(done) {
        global.$_POST = {
            name: 'Test Preset',
            type: 'template',
            location: 'with-left-sidebar',
            properties: {}
        };

        presetRoute.updatePreset( req, res )
            .then( response => {
                assert.isTrue( response.success );
                presetId = response.ID;

                done();
            })
            .catch(done);
    });

    it('Should get the data of the given preset id for visual editing', function(done) {
        presetRoute.editPreset( {param: {id: presetId} })
            .then( response => {
                assert.equal( response.preset.ID, presetId );
                done();
            })
            .catch(done);
    });

    it('Should get the list of presets', function(done) {
        presetRoute.getPresets({})
            .then( response => {
                assert.isArray( response.presets );
                assert.equal( response.presets.length, 1 );
                done();
            })
            .catch(done);
    });

    it('Should delete the selected preset', function(done) {
        presetRoute.deletePreset({param: {id: presetId}}, res )
            .then( response => {
                assert.isTrue(response.success);
                done();
            })
            .catch(done);
    });

    it('Should close database connection', done => {
        dbManager.close();
        done();
    });
});