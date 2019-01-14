'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class CommentsManager extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'Comments MANAGER';
    }
}
addComponent( 'CommentsManager', <CommentsManager/> );