'use strict';

import React from 'react';
import Index from './index';
import {getComponent} from "./component/component";
import './users/manager';
import './users/edit';
import './users/group-manager';
import './presets/manager';
import './presets/edit-preset';

export default class Admin extends Index {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        if ( ! this.props.templateNow ) {
            // @todo: Set default
            return null;
        }

        let template = getComponent( this.props.templateNow, this.properties );
        if ( ! template ) {
            // @todo: ??
            return null;
        }

        return template;
    }
}