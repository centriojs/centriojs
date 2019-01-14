'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class ContentManager extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'CONTENT MANAGER';
    }
}
addComponent( 'ContentManager', <ContentManager/> );