'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class ContentTypes extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'content types';
    }
}
addComponent( 'ContentTypes', <ContentTypes/> );