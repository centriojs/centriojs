'use strict';

import React, {Component} from 'react';

let id = Date.now();

export default class Helper extends Component {
    constructor(props) {
        super(props);

        this.id = id++;
        this.state = this.getState();
    }

    getState() {
        return {};
    }

    updateState(state) {
        this.setState(state);
    }

    componentDidMount() {
        this.mounted = true;
    }

    componentDidUpdate(prevProps) {
        this.mounted = true;

        let state = {},
            update = false;

        Object.keys(this.state).map((key) => {
            if ( ! this.props[key] || ! prevProps[key] ) {
                return false;
            }

            let value = JSON.stringify(this.props[key]),
                oldValue = JSON.stringify(prevProps[key]);

            if ( value === oldValue ) {
                return false;
            }

            update = true;
            state[key] = this.props[key];
        });

        if ( ! update ) {
            return false;
        }

        this.setState(state);
    }

    componentDidCatch() {
        this.setState({hasError: true});
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    render() {
        if ( this.state.hasError ) {
            return null;
        }

        return this.props.children;
    }
}