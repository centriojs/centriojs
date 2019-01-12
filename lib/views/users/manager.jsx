'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class UsersManager extends Template {
    constructor(props) {
        super(props);
    }

    render() {
        return 'USERS MANAGER';
    }
}
addComponent( 'UsersManager', <UsersManager/> );