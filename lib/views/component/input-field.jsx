'use strict';

import React from 'react';
import Lang from './lang';
import FormField from '../form-api/field';
import _ from 'underscore';

const Input = (inputArgs, render) => {
    let {inputApi, meta} = inputArgs;

    let label = inputApi.props.label,
        desc = inputApi.props.description;

    if ( ! render ) {

        render = ({input}) => {
            switch(input.type) {
                default :
                    return <input {...input} />;
            }
        };
    }

    return (
        <div className={'input-field'}>
            <label className={'label'}>{label}</label>
            <div className={'input'}>
                {render(inputArgs)}
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
        render: e => Input(e, props.render)
    }} />;
};

export default InputField;