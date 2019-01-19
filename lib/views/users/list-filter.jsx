'use strict';

import React from 'react';
import Template from '../component/template';
import FormApi from '../form-api/form';
import {addComponent} from "../component/component";
import Search from "../component/search";
import Lang from "../component/lang";
import InputField from '../component/input-field';

export default class UsersListFilter extends Template {
    form({handleSubmit, form}) {
        return (
            <form method={'post'} onSubmit={handleSubmit}>
                <InputField {...{
                    formApi: form,
                    name: 'group',
                    label: <Lang text={'Group'} />,
                    type: 'select',
                    choices: {
                        administrator: 'Administrator'
                    }
                }} />
                <InputField {...{
                    formApi: form,
                    name: 'status',
                    label: <Lang text={'Status'} />,
                    type: 'select',
                    choices: {
                        online: 'Online',
                        offline: 'Offline'
                    }
                }} />
            </form>
        );
    }

    onSubmit( values, formApi ) {}

    render() {
        if ( this.hasError() ) {
            return null;
        }

        return (
            <div>
                <Search />
                <button type={'button'}><Lang text={'Filter'} /></button>
                <button type={'button'} className={'screen-setting-button'}>O</button>
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
addComponent( 'UsersListFilter', <UsersListFilter/> );