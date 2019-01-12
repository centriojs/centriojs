'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class EditPreset extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'EDIT PRESET';
    }
}
addComponent( 'EditPreset', <EditPreset/> );