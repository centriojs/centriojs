'use strict';

import React from 'react';
import _ from 'underscore';

const Components = {};

export const addComponent = (name, template) => {
    Components[name] = template;
};

export const getComponent = function( name, props ) {
    if ( ! Components[name] ) {
        return null;
    }

    let children = arguments[2] || false;

    return React.cloneElement( Components[name], props, children );
};

export const removeComponent = name => {
    if ( Components[name] ) {
        delete Components[name];
    }
};

export const getComponents = () => {
    return Components;
};