'use strict';

import React from 'react';
import Template from './template';
import {addComponent} from "./component";

export default class Include extends Template {
    constructor(props) {
        super(props);

        this.state.location = this.props.location;
    }

    render() {
        if ( this.hasError() ) {
            return null;
        }

        return this.parseTemplate( this.state.location );
    }
}
addComponent( 'Include', <Include/> );