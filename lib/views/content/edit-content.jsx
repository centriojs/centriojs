'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class EditContent extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'Edit content here';
    }
}
addComponent( 'EditContent', <EditContent /> );