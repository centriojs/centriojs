'use strict';

import React from 'react';
import Index from './index';
import {getComponent} from "./component/component";
import './component/alert';
import './users/manager';
import './users/edit';
import './users/group-manager';
import './presets/manager';
import './presets/edit-preset';
import './content/content-types';
import './content/edit-content-type';
import './content/content-manager';
import './content/category-manager';
import './content/comments-manager';

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