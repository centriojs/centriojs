'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class EditContentType extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'EDIT CONTENT TYPE';
    }
}
addComponent( 'EditContentType', <EditContentType/> );