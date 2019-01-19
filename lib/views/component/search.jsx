'use strict';

import React from 'react';
import Template from './template';
import FormApi from '../form-api/form';
import Lang from './lang';

export default class Search extends Template {
    onSubmit( values, formApi ) {}

    form({handleSubmit, form}) {
        let Field = form.Field;

        return (
            <form method={'get'} onSubmit={handleSubmit} className={'search-form'}>
                <div>
                    <Field {...{
                        name: 'search',
                        render: ({input}) => {
                            input.placeholder = this.props.placeholder || 'Search';
                            
                            return <input {...input} type={'text'} />;
                        }
                    }} />
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