'use strict';

import React from 'react';
import Template from './component/template';
import {getComponent} from "./component/component";
import './install/install';
import './templates/archive';
import './templates/single';
import './templates/search-results';
import './templates/no-access';
import './users/login-form';

export default class Index extends Template {
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