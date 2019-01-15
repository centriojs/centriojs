'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class Archive extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'THE ARCHIVE';
    }
}
addComponent( 'Archive', <Archive/> );