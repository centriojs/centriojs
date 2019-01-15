'use strict';

import React from 'react';
import Template from './component/template';
import {getComponent} from "./component/component";
import './install/install';
import './templates/archive';
import './templates/single';
import './templates/search-results';

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