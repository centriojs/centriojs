'use strict';

import React from 'react';
import Template from './component/template';
import {getComponent} from "./component/component";
import './component/alert';
import './component/include';
//import './users/manager';
import './users/edit';
import './users/group-manager';
import './users/edit-profile';
import './users/users-list-table';
import './users/list-filter';
import './presets/manager';
import './presets/edit-preset';
import './content/content-types';
import './content/edit-content-type';
import './content/content-manager';
import './content/comments-manager';
import './templates/no-access';

export default class Admin extends Template {
    constructor(props) {
        super(props);

        this.properties = props;
        this.setListener();
    }

    render() {
        if ( this.hasError() ) {
            return null;
        }

        let template = getComponent( this.props.templateNow, this.properties );
        if ( ! template && this.props.path ) {
            // try locating the template path
            return this.parseTemplate( this.props.path, this.properties );
        }

        return template;
    }
}