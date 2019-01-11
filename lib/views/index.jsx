'use strict';

import React from 'react';
import Template from './component/template';
import {getComponent} from "./component/component";
import './install/install';

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

        if ( ! this.props.typeNow ) {
            // @todo: Set default
        }

        let template = getComponent( this.props.typeNow, this.properties );
        if ( ! template ) {
            // @todo: ??
            return null;
        }

        return template;
    }
}