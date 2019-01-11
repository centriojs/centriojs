'use strict';

import React from 'react';
import Helper from './helper';
import _ from 'underscore';

export default class Field extends Helper {
    constructor(props) {
        super(props);

        this.formApi = this.props.formApi || false;

        this.state = {
            name: this.props.name,
            error: false,
            value: this.__value(),
            selected: this.props.selected || undefined
        };

        this.ref = React.createRef();
        this.touched = false;
        this.value = this.props.value || undefined;
    }

    __value() {
        let value = this.props.value || '';

        if ( this.formApi && this.formApi.inputValues &&
            this.formApi.inputValues[this.props.name] ) {
            value = this.formApi.inputValues[this.props.name];
        }

        if ( this.props.multiple ) {
            value = 'string' === typeof value ? [value] : value;
        }

        return value;
    }

    updateState( state ) {
        if ( ! this.mounted ) {
            return null;
        }

        this.setState(state, () => {
            if ( ! this.props.onStateChanged ) {
                return null;
            }

            let stateChanged = this.props.onStateChanged;
            stateChanged( this.props.name, this.state );
        });
    }

    getValue() {
        return this.state.value;
    }

    reset() {
        let value = this.__value();

        this.setValue(value);
    }

    setValue(value) {
        if ( this.formApi && this.formApi.inputValues[this.props.name] ) {
            this.formApi.inputValues[this.props.name] = value;
        }

        this.updateState({
            value: value,
            error: false
        });
    }

    setError(error) {
        if ( ! this.mounted ) {
            return false;
        }

        this.updateState({error: error});
    }

    validate( value ) {
        if ( ! this.props.validate ) {
            return undefined;
        }

        let validation = this.props.validate;

        return validation.call( validation, value, this );
    }

    isWritable() {
        let type = this.props.type,
            types = ['checkbox', 'radio', 'select', 'upload'];

        return ! _.contains( types, type );
    }

    __getValue(ev) {
        let value = ev.target.value;

        if ( 'checkbox' === this.props.type ) {
            value = ev.target.checked ? ev.target.value : undefined;
        }

        if ( this.props.multiple ) {
            let oldValue = this.state.value || [];

            if ( ! value ) {
                // Remove from the list if it exist
                value = _.without( oldValue, ev.target.value );
            } else {
                oldValue.push(value);
                value = oldValue;
            }
        }

        if ( 'upload' === this.props.type ) {
            value = ev.target.files;
        }

        return value;
    }

    checkChanged(ev) {
        let value = this.__getValue(ev),
            state = {value: value};

        if ( ! this.props.onChange ) {
            this.updateState(state);

            return false;
        }

        this.updateState(state);
        this.touched = false;

        let onChange = this.props.onChange;
        onChange.apply( onChange, [value, this] );

        return false;
    }

    onChange(ev) {
        let value = this.__getValue(ev);

        this.updateState({value: value, error: false});
    }

    onBlur(ev) {
        ev.preventDefault();

        let value = this.state.value,
            error = this.validate(value),
            state = {error: error};

        if ( ! this.props.onChange ) {
            this.updateState(state);
            this.touched = false;

            return false;
        }

        this.updateState(state);
        this.touched = false;

        let onChange = this.props.onChange;
        onChange.apply( onChange, [value, this] );
    }

    changeValue(value) {
        let state = {value: value},
            error = this.validate(value);

        state.error = error;

        // This is where you trigger the on changed event
        if ( ! this.props.onChange ) {
            this.updateState(state);
            this.touched = false;

            return;
        }

        this.touched = false;
        this.updateState(state);

        // Check for an onchange attached event
        if ( ! this.props.onChange ) {
            return false;
        }

        let onChange = this.props.onChange;
        onChange.apply( onChange, [value, this] );

        return true;
    }

    componentDidMount() {
        this.mounted = true;

        if ( this.formApi ) {
            this.formApi.inputValues[this.props.name] = this.state.value;
            this.formApi.inputFields[this.props.name] = this;
        }
    }

    componentDidUpdate(prevProps) {
        this.componentDidMount();

        if ( prevProps.value !== this.props.value ) {
            this.updateState({value: this.props.value});
        }
    }

    render() {
        if ( this.state.hasError ) {
            return null;
        }

        let input = {
            name: this.props.name,
            value: this.state.value
        };

        if ( this.isWritable() ) {
            input.onChange = e => this.onChange(e);
            input.onBlur = e => this.onBlur(e);
        } else {
            input.onChange = e => this.checkChanged(e);
        }

        let props = {
            input: input,
            inputApi: this,
            meta: { error: this.state.error }
        };

        let render = this.props.render;

        return render(props);
    }
}