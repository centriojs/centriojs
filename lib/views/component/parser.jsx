'use strict';

import React from 'react';
import {getComponents, getComponent} from "./component";
import _ from 'underscore';

let id = Date.now();

class Text extends React.Component {
    render() {
        return this.props.children;
    }
}

class TemplateParser extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            components: this.props.components || {},
            props: this.props.props || {},
            template: this.props.template || {}
        };
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
        let components = this.state.components,
            children = [];

        if ( node.children ) {
            Object.values(node.children).map( child => {
                children.push( this.iterate(child) );
            });
        }

        let name = node.name,
            attr = node.attributes || {};

        attr = this.parseAttr(attr);
        attr.key = _.uniqueId( 'node-' );

        // If it has `checked` attribute, set an onchange
        if ( attr.checked ) {
            attr.onChange = _.noop;
        }

        if ( components[name] ) {
            return getComponent( name, attr, children );
        }

        if ( '#text' === name ) {
            return <Text key={'node-' + id++}>{node.text}</Text>;
        }

        if ( node.isSelfClosing ) {
            return React.createElement( name, attr );
        }

        return React.createElement( name, attr, children );
    }

    render() {
        let children = [];

        Object.values(this.state.template).map( child => {
            children.push(this.iterate(child));
        });

        return children;
    }
}

export const parseTemplate = (template, props) => {
    return <TemplateParser {...{
        template: template,
        components: getComponents(),
        key: _.uniqueId('tpl-key'),
        props: props || {}
    }} />;
};