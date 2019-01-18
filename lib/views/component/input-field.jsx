'use strict';

import React from 'react';
import Lang from './lang';
import FormField from '../form-api/field';
import _ from 'underscore';

const Input = (inputArgs, render, input) => {
    let {inputApi, meta} = input;

    let label = inputApi.props.label,
        desc = inputApi.props.description;

    if ( ! render ) {

        render = ({input}) => {
            switch(inputArgs.type) {
                default :
                    input.type = inputArgs.type;
                    return <input {...input} />;

                case 'checkbox' :
                case 'radio' :
                    if ( ! inputArgs.options ) {
                        return null;
                    }

                    let inputs = [],
                        keys = Object.keys(inputArgs.options);

                    delete input.options;

                    keys.map( key => {
                        let inputLabel = inputArgs.options[key],
                            checked = false;

                        if ( (_.isArray(input.value) && _.contains( input.value, key ) ) || input.value === key ) {
                            checked = true;
                        }

                        let _label = <input {...input} type={inputArgs.type} value={key} checked={checked} />,
                            uniqKey = _.uniqueId('key');

                        if ( keys.length > 1 ) {
                            return inputs.push(<li key={uniqKey}><label>{_label} {inputLabel}</label></li>);
                        }

                        inputs.push(<label key={uniqKey}>{_label} {inputLabel}</label>);
                    });

                    if ( inputs.length > 1 ) {
                        return <ul>{inputs}</ul>;
                    }

                    return inputs;

                case 'select' :
                    if ( ! inputArgs.choices ) {
                        return null;
                    }

                    let choices = [];

                    Object.keys(inputArgs.choices).map( key => {
                        let value = inputArgs.choices[key];

                        choices.push(
                            <option value={key}>{value}</option>
                        );
                    });

                    delete input.choices;

                    return <select {...input}>{choices}</select>;
            }
        };
    }

    return (
        <div className={'input-field'}>
            {inputApi.props.label && <label className={'label'}>{label}</label>}
            <div className={'input'}>
                {render(input)}
                {meta.error && <span className={'error'}>{meta.error}</span>}
                {desc && <p className={'description'}>{desc}</p>}
            </div>
        </div>
    );
};

const InputField = props => {
    let properties = _.extend( {}, props );

    let Field = props.formApi.Field || FormField,
        required = value => (value ? undefined : <Lang text={'Required'} />);

    if ( props.required ) {
        properties.validate = e => required(e);
    }

    return <Field {...properties} {...{
        render: e => Input( properties, props.render, e )
    }} />;
};

export default InputField;