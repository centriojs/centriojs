'use strict';

import React from 'react';
import {parseTemplate} from "./parser";
import {getState} from "./router";
import _ from "underscore";
import {appEvent} from './hooks';

export default class Template extends React.Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    setListener() {
        this.tplId = _.uniqueId('tpl_');
        appEvent.on( 'pageChanged', this.onPageChanged.bind(this), 0, this.tplId );
    }

    onPageChanged(state) {
        this.updateState(state);
    }

    updateState(state) {
        if ( ! this.mounted ) {
            return null;
        }

        this.setState( state, this.onStateChanged.bind(this) );
    }

    onStateChanged() {
        // Do nothing
        return null;
    }

    componentDidCatch( error, info ) {
        // @todo: Logged error

        this.updateState({hasError: true});
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentDidUpdate(prevProps) {
        if ( ! this.state || _.isEqual( prevProps, this.props ) ) {
            return null; // Do nothing
        }

        let state = _.pick( this.props, _.keys( this.state ) );
        this.updateState(state);
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    hasError() {
        return this.state.hasError;
    }

    parseTemplate( templateId, props ) {
        let templates = getState( '__templates', {} );

        if ( !! templates[templateId] ) {
            return parseTemplate( templates[templateId], props );
        }

        return null;
    }
}