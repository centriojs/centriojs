'use strict';

import React from 'react';

const Components = {};

export const addComponent = (name, template) => {
    Components[name] = template;
};

export const getComponent = (name, props) => {
    if ( ! Components[name] ) {
        return null;
    }

    return React.cloneElement(Components[name], props);
};

export const removeComponent = name => {
    if ( Components[name] ) {
        delete Components[name];
    }
};

export const getComponents = () => {
    return Components;
};