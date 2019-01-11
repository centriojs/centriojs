'use strict';

import React from 'react';
import {renderToString} from 'react-dom/server';
import Index from './index';

const IndexTemplate = options => {
    return <Index {...options} />;
};

module.exports = options => {
    return renderToString(IndexTemplate(options));
};