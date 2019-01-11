'use strict';

import React from 'react';
import Helper from './helper';
import Field from './field';
import _ from 'underscore';

class ErrorHandler extends Helper {
    getState() {
        return {
            error: this.props.error || false,
            errorCount: this.props.errorCount || 0
        };
    }

    render() {
        if ( ! this.state.error ) {
            return null;
        }

        let render = this.props.render;

        return render( this.state.error, this.state.errorCount );
    }
}

class Submitting extends Helper {
    getState() {
        return {
            submitting: this.props.submitting || false
        };
    }

    render() {
        if ( this.state.hasError ) {
            return null;
        }

        let render = this.props.render;

        return render( this.state.submitting );
    }
}

class ResponseHandler extends Helper {
    getState() {
        return {
            type: this.props.type,
            message: this.props.message
        };
    }

    render() {
        if ( ! this.state.type ) {
            return null;
        }

        let render = this.props.render;

        return render(this.state);
    }
}

export default class Form extends Helper {
    constructor(props) {
        super(props);

        this.state = {};
        this.error = false;
        this.errorCount = 0;
        this.inputErrors = {};
        this.inputValues = this.props.values || {};
        this.inputFields = {};

        this.submitting = false;
        this.ref = React.createRef();
        this.errorHandler = React.createRef();
        this.submissionHandler = React.createRef();

        this.onSubmit = this.onSubmit.bind(this);
        this.onSubmitError = this.onSubmitError.bind(this);
        this.onSubmitting = this.onSubmitting.bind(this);
        this.onInputStateChanged = this.onInputStateChanged.bind(this);

        this.Field = class FormField extends Field {};
        this.Field.defaultProps = {
            formApi: this,
            onStateChanged: (n, s) => this.onInputStateChanged(n, s)
        };
    }

    reset() {
        this.inputErrors = {};
        this.inputValues = {};
        this.submitting = false;
        //this.done();

        _.each( this.inputFields, field => {
            field.reset();
        });
    }

    refresh() {
        let state = ! this.state.state;
        this.updateState({state: state});
    }

    onSubmit(ev) {
        if ( ev ) {
            ev.preventDefault();
        }

        let errors = Object.keys(this.inputErrors);

        if ( errors.length ) {
            // Don't submit if there are still input errors
            return false;
        }

        // Recheck input errors in case the form is submitted without touching the inputs
        let inputs = this.inputFields;
        Object.keys(inputs).map( key => {
            let input = inputs[key],
                value = this.inputValues[key],
                error = false;

            if ( error = input.validate(value) ) {
                errors++;
            }

            if ( error ) {
                input.setError(error);
            }
        });

        if ( errors > 0 ) {
            return false;
        }

        this.setProgressStatus(true);

        let handleSubmit = this.props.onSubmit;
        let error = handleSubmit( this.inputValues, this );

        if ( ! error ) {
            // Let the form submit handler do it's thing and just submit the form
            return true;
        }

        // Otherwise, trigger error
        this.setError(error);
    }

    onSubmitError(display) {
        return <ErrorHandler ref={this.errorHandler} error={this.error} errorCount={this.errorCount} render={display} />;
    }

    onSubmitting(display) {
        return <Submitting ref={this.submissionHandler} submitting={this.submitting} render={display} />;
    }

    onInputStateChanged(name, state) {
        this.inputValues[name] = state.value;

        if ( state.error ) {
            this.inputErrors[name] = state.error;
        }

        if ( this.inputErrors[name] ) {
            delete this.inputErrors[name];
        }
    }

    setError(error) {
        this.error = error;

        if ( ! this.errorHandler.current ) {
            return false;
        }

        this.errorHandler.current.updateState( {error: this.error} );
    }

    setProgressStatus(submitting) {
        if ( ! this.submissionHandler.current ) {
            return null;
        }

        this.submissionHandler.current.updateState( {submitting: submitting} );
    }

    done(type, message) {
        if ( this.ref.current ) {
            this.ref.current.updateState({
                type: type,
                message: message
            });
        }

        this.setProgressStatus(false);
    }

    setValue( name, value ) {
        this.inputValues[name] = value;
    }

    responseHandler(display) {
        return <ResponseHandler {...{
            ref: this.ref,
            render: display
        }} />;
    }

    render() {
        if ( this.state.hasError ) {
            return null;
        }

        let props = {
            form: this,
            handleSubmit: this.onSubmit,
            handleResponse: e => this.responseHandler(e),
            handleSubmitError: this.onSubmitError,
            handleSubmissionProgress: this.onSubmitting
        };

        let render = this.props.render,
            children = render(props);

        return children;
    }
}