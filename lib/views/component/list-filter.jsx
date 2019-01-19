'use strict';

import React from 'react';
import Template from './template';
import FormApi from '../form-api/form';
import Lang from './lang';
import Search from './search';

export default class ListFilter extends Template {
    form() {}

    onSubmit( values, formApi ) {}

    render() {
        if ( this.hasError() ) {
            return null;
        }

        return (
            <div>
                <Search />
                <button type={'button'}><Lang text={'Filter'} /></button>
                <button type={'button'}>O</button>
                <div>
                    <FormApi {...{
                        render: this.form.bind(this),
                        onSubmit: this.onSubmit.bind(this)
                    }} />
                </div>
            </div>
        );
    }
}