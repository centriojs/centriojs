'use strict';

import React from 'react';
import {renderToString} from 'react-dom/server';
import Index from './index';
import Admin from './admin';

const IndexTemplate = options => {
    if ( options.isAdmin ) {
        return <Admin {...options} />;
    }

    return <Index {...options} />;
};

module.exports = options => {
    return renderToString(IndexTemplate(options));
};