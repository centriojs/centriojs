'use strict';

import React from 'react';
import {getComponents} from "./component";

let id = Date.now();

class Text extends React.Component {
    render() {
        return this.props.children;
    }
}

class TemplateParser {
    constructor( props, components, template ) {
        this.components = components || {};
        this.props = props || {};
        this.template = template || {};
    }

    parseAttr(attr) {
        let keys = {
            class: 'className',
            colspan: 'colSpan',
            rowspan: 'rowSpan',
            autofocus: 'autoFocus',
            autoplay: 'autoPlay',
            crossorigin: 'crossOrigin',
            srcset: 'srcSet',
            tabindex: 'tabIndex',
            usemap: 'useMap',
            maxlength: 'maxLength',
            minlength: 'minLength',
            accesskey: 'accessKey',
            autocomplete: 'autoComplete',
            for: 'htmlFor',
            readonly: 'readOnly',
            cellpadding: 'cellPadding',
            cellspacing: 'cellSpacing',
            enctype: 'encType',
            inputmode: 'inputMode',
            value: 'defaultValue'
        };

        Object.keys(attr).map( key => {
            if( keys[key] ) {
                attr[keys[key]] = attr[key];
                delete attr[key];
            }
        });

        return attr;
    }

    iterate(node) {
        let components = this.components,
            children = [];

        if ( node.children ) {
            Object.values(node.children).map( child => {
                children.push( this.iterate(child) );
            });
        }

        let _node = '',
            name = node.name,
            attr = node.attributes || {};

        attr = this.parseAttr(attr);
        attr.key = 'node-' + id++;

        if ( components[node.name] ) {
            let compo = components[name];

            _node = React.cloneElement( compo, attr, children );
        } else {
            if ( '#text' === name ) {
                _node = <Text key={'node-' + id++}>{node.text}</Text>;
            } else {
                _node = React.createElement( name, attr, children );
            }
        }

        return _node;
    }

    render() {
        let children = [];

        Object.values(this.template).map( child => {
            children.push(this.iterate(child));
        });

        return children;
    }
}

export const parseTemplate = (template, props) => {
    return new TemplateParser( props, getComponents(), template );
    /**
    return <TemplateParser {...{
        template: template,
        components: getComponents(),
        key: _.uniqueId('tpl-key'),
        props: props || {}
    }} />;
     **/
};