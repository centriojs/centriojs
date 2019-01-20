'use strict';

import React from 'react';
import Template from './template';
import FormApi from '../form-api/form';
import {getState} from "./router";
import Lang from './lang';

export default class Search extends Template {
    onSubmit( values, formApi ) {}

    form({handleSubmit, form}) {
        let Field = form.Field,
            term = getState('searchTerm', ''),
            attr = {
                method: 'get',
                onSubmit: handleSubmit,
                className: 'search-form'
            };

        if ( term ) {
            attr.className += ' has-term';
        }

        return (
            <form {...attr}>
                <div className={'search-box'}>
                    <Field {...{
                        name: 'search',
                        value: term,
                        render: ({input}) => {
                            input.placeholder = this.props.placeholder || 'Search';

                            return <input {...input} type={'text'} />;
                        }
                    }} />
                    <a href={'#'} className={'clear-search'}>X</a>
                </div>
            </form>
        );
    }

    render() {
        if ( this.hasError() ) {
            return null;
        }

        return <FormApi {...{
            onSubmit: this.onSubmit.bind(this),
            render: this.form.bind(this)
        }}/>
    }
}