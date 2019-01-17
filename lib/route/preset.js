'use strict';

const _ = require('../mixin');

class PresetRoutes {
    constructor() {
        appEvent.on( 'adminInit', this.setPresetAdminRoutes.bind(this) );
    }

    setPresetAdminRoutes(router) {
        router.setView( '/presets', this.getPresets.bind(this), true, 'managePresets' );
        router.setView( '/presets/page/:page', this.getPresets.bind(this), true, 'managePresets' );
        router.setView( '/presets/:type', this.getPresets.bind(this), true, 'managePresets' );
        router.setView( '/presets/:type/page/:page', this.getPresets.bind(this), this, 'managePresets' );

        router.setView( '/presets/edit', this.editPreset.bind(this), true, 'managePresets' );
        router.setView( '/presets/edit/:id', this.editPreset.bind(this), true, 'managePresets' );
        router.setPostResponse( '/presets/edit', this.updatePreset.bind(this), this, 'managePresets' );
        router.setPostResponse( '/presets/edit/:id', this.updatePreset.bind(this), this, 'managePresets' );
        router.setPostResponse( '/presets/delete/:id', this.deletePreset.bind(this), this, 'managePresets' );
    }

    async getPresets(param) {
        let page = param && param.page || 1,
            type = param && param.type || false,
            queryArgs = {},
            response = {
                title: il8n('Presets'),
                templateNow: 'Presets'
            };

        let settings = await getUserSetting( currentUser.ID, '__presets', {
            perPage: 50
        });

        queryArgs.page = page;
        queryArgs.perPage = settings.perPage;

        if ( type ) {
            queryArgs.type = type;
        }

        response.userSettings = settings;
        response.presets = await getPresets(queryArgs);

        return response;
    }

    async editPreset(param) {
        let id = param && param.id || false,
            response = {
                title: id ? il8n('Edit Preset') : il8n('New Preset'),
                templateNow: 'EditPreset'
            };

        if ( id ) {
            let preset = await getPreset(id).catch(errorHandler);

            if ( preset.ID ) {
                response.preset = preset;
            }
        }

        return response;
    }

    async updatePreset( req, res ) {
        let id = req.param.id || false,
            preset = _.pick( $_POST, ['name', 'type', 'location', 'contentType', 'properties', 'modules', 'menu'] ),
            response = {};

        preset = _.stripSlashes(preset);

        if ( id ) {
            preset.ID = id;

            let done = await updatePreset(preset).catch(errorHandler);
            if ( ! done || done.error ) {
                response.error = true;
                response.message = done.message || il8n('Something went wrong. Unable to update preset.');

                return res.json(response);
            }

            response.ID = id;
            response.success = true;
            response.message = il8n('Update successful.');

            return res.json(response);
        }

        id = await addPreset(preset).catch(errorHandler);
        if ( ! id || id.error ) {
            response.error = true;
            response.message = id.message || il8n('Something went wrong. Unable to update preset.');

            return res.json(response);
        }

        response.ID = id;
        response.success = true;
        response.message = il8n('New preset successfully added.');

        return res.json(response);
    }

    async deletePreset( req, res ) {
        let id = req.param.id,
            response = {};

        let done = await deletePreset(id).catch(errorHandler);
        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to delete the selected preset.');

            return res.json(response);
        }

        response.success = true;
        response.message = il8n('Delete completed.');

        return res.json(response);
    }
}
module.exports = new PresetRoutes();