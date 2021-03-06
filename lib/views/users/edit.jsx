'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class EditUser extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'EDIT USER';
    }
}
addComponent( 'EditUser', <EditUser/> );