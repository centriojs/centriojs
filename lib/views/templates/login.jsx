'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";
import {getState} from "../component/router";

class LoginPage extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return this.parseTemplate( '/login', this.state );
    }
}
addComponent( 'LoginPage', <LoginPage/> );