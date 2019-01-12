'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class GroupManager extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'USER GROUP MANAGER';
    }
}
addComponent( 'GroupManager', <GroupManager/> );