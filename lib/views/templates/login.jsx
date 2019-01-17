'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class LoginPage extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return this.parseTemplate( 'login' );
    }
}
addComponent( 'LoginPage', <LoginPage/> );