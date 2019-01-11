'use strict';

import React from 'react';
import Template from './template';
import {addComponent} from "./component";

/**
 * Helper component to translate text.
 *
 * @props {string} text
 */
export default class Lang extends Template {
    constructor(props) {
        super(props);

        this.state = {
            text: this.props.text
        };
    }

    render() {
        if ( this.hasError() || ! this.state.text ) {
            return null;
        }

        return this.state.text;
    }
}
addComponent( 'Lang', <Lang /> );