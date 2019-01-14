'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class CategoryManager extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'category MANAGER';
    }
}
addComponent( 'CategoryManager', <CategoryManager/> );