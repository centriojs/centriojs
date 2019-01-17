'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class NoAccess extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'NO ACCESS TEMPLATE';
    }
}
addComponent( 'NoAccess', <NoAccess/> );