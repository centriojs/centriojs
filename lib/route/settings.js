'use strict';

const _ = require('../mixin');

class SettingsRoute {
    constructor() {
        appEvent.on( 'adminInit', e => this.setAdminRoutes(e), 0, 'admin-settings' );
    }

    setAdminRoutes(router) {}

    async getSettings({param}) {
        let type = param.type || 'general',
            response = {
                templateNow: 'AdminSettings'
            };

        let settingPages = getSettingPages();
        response.settingPages = settingPages;

        let current = settingPages[type],
            $default = current && current.$default || {};

        response.title = current && current.title || il8n('Settings');

        let settings = await getSetting( type, $default ).catch(errorHandler);
        if ( ! settings || settings.error ) {
            settings = {};
        }
        response.settings = settings;

        return response;
    }

    async updateSettings( req, res ) {
        let type = req.param.type,
            settings = $_POST.settings  || {},
            response = {};

        settings = _.stripSlashes(settings);

        let done = await setSetting( type, settings ).catch(errorHandler);
        if ( ! done || done.error ) {
            response.error = true;
            response.message = done.message || il8n('Something went wrong. Unable to update settings.');

            return res.json(response);
        }

        response.success = true;
        response.message = il8n('Update successfully completed.');

        return res.json(response);
    }
}
module.exports = new SettingsRoute();