'use strict';

import React from 'react';
import Template from './template';
import {addComponent, getComponent} from "./component";

export default class Alert extends Template {
    constructor(props) {
        super(props);

        this.state = {
            type: this.props.type || null,
            message: this.props.message || null,
            duration: this.props.duration || 0
        };
    }

    timeOut() {
        if ( ! this.state.duration ) {
            return null;
        }

        let duration = this.state.duration * 1000,
            timer;

        timer = setInterval( () => {
            clearImmediate(timer);

            this.updateState({
                type: null,
                message: null,
                duration: 0
            });
        }, duration );
    }

    render() {
        if (this.hasError() || !this.state.type) {
            return null;
        }

        let _class = 'alert alert-' + this.state.type;

        this.timeOut();

        return (
            <div className={_class}>
                <p>{this.state.message}</p>
            </div>
        );
    }
}
addComponent( 'Alert', <Alert/> );