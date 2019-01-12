'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class Presets extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'PRESETS MANAGER';
    }
}
addComponent( 'Presets', <Presets/> );