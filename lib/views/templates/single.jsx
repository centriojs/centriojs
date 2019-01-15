'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class Single extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'SINGLE CONTENT TEMPLATE';
    }
}
addComponent( 'Single', <Single/> );