'use strict';

import React from 'react';
import Template from '../component/template';
import FormApi from '../form-api/form';
import {addComponent} from "../component/component";
import InputField from '../component/input-field';
import Lang from '../component/lang';
import {Component} from "../component/hooks";

class LoginForm extends Template {
    validateEmail(email) {
        if ( ! email ) {
            return <Lang text={'Invalid email address.'} />;
        }

        return undefined;
    }

    onSubmit( values, formApi ) {}

    form({handleSubmit, form}) {
        return (
            <form method={'post'} action={'/login'} className={'login-form'} onSubmit={handleSubmit}>
                <div>
                    <InputField {...{
                        formApi: form,
                        name: 'email',
                        label: <Lang text={'Email Address'} />,
                        validate: this.validateEmail.bind(this)
                    }} />
                    <InputField {...{
                        formApi: form,
                        name: 'pwd',
                        label: <Lang text={'Password'} />,
                        required: true,
                        type: 'email'
                    }} />
                    <InputField {...{
                        name: 'remember',
                        value: 1,
                        options: {
                            1: <Lang text={'Remember me'} />
                        }
                    }} />
                    <button type={'submit'} className={'submit'}>
                        <Lang text={'Login'} />
                    </button>
                </div>
                {
                    /**
                     * Trigger after printing the login form.
                     *
                     * @param {object} formApi
                     * @param {object} LoginForm instance
                     */
                    Component.render('afterLoginForm', form, this)}
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
        }} />;
    }
}
addComponent( 'LoginForm', <LoginForm /> );