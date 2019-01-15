'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class EditProfile extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'EDIT USER PROFILE';
    }
}
addComponent( 'EditProfile', <EditProfile/> );