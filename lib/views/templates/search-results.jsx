'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class SearchResults extends Template {
    render() {
        if ( this.hasError() ) {
            return null;
        }

        return 'SEARCH RESULTS';
    }
}
addComponent( 'SearchResults', <SearchResults/> );