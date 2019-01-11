'use strict';

import React from 'react';
import Template from '../component/template';
import FormApi from '../form-api/form';
import InputField from '../component/input-field';
import Alert from '../component/alert';
import {addComponent} from "../component/component";

class AppSetup extends Template {
    constructor(props) {
        super(props);

        this.setListener();
    }

    onSubmit( values, formApi ) {}

    form({handleSubmit, form}) {
        return (
            <form method={'post'} onSubmit={handleSubmit}>
                <div>
                    <div>
                        <h3>Database</h3>
                        <InputField {...{
                            formApi: form,
                            name: 'host',
                            label: 'Host',
                            placeholder: 'localhost'
                        }}/>
                        <InputField {...{
                            formApi: form,
                            name: 'dbName',
                            label: 'Database',
                            required: true
                        }} />
                        <InputField {...{
                            formApi: form,
                            name: 'dbUser',
                            label: 'User',
                            required: true
                        }} />
                        <InputField {...{
                            formApi: form,
                            name: 'dbPass',
                            label: 'Password',
                            required: true
                        }} />
                        <InputField {...{
                            formApi: form,
                            name: 'prefix',
                            label: 'Prefix',
                            description: 'Use to prefix database tables.'
                        }} />
                    </div>
                    <div>
                        <h3>Application</h3>
                        <InputField {...{
                            formApi: form,
                            name: 'appName',
                            label: 'Name',
                            required: true
                        }} />
                        <InputField {...{
                            formApi: form,
                            name: 'tagline',
                            label: 'Tagline'
                        }} />
                        <div>
                            <h4>Administrator</h4>
                            <InputField {...{
                                formApi: form,
                                name: 'display',
                                label: 'Display Name',
                                required: true
                            }} />
                            <InputField {...{
                                formApi: form,
                                name: 'email',
                                label: 'Email',
                                required: true
                            }} />
                        </div>
                    </div>
                </div>
                <button type={'submit'} className={'submit'}>Install</button>
            </form>
        );
    }

    render() {
        if ( this.hasError() ) {
            return null;
        }

        return (
            <section>
                <header>
                    <h2>Configuration</h2>
                    <Alert type={'error'} message={this.props.error} />
                </header>
                <FormApi {...{
                    render: this.form.bind(this),
                    onSubmit: this.onSubmit.bind(this)
                }} />
            </section>
        )
    }
}
addComponent( 'AppSetup', <AppSetup/> );