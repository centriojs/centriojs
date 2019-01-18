'use strict';

import React from 'react';
import Template from '../component/template';
import FormApi from '../form-api/form';
import {addComponent} from "../component/component";
import InputField from '../component/input-field';
import Alert from '../component/alert';
import Lang from '../component/lang';
import {Component} from "../component/hooks";
import {getState} from "../component/router";

class LoginForm extends Template {
    validateEmail(email) {
        if ( ! email ) {
            return <Lang text={'Invalid email address.'} />;
        }

        return undefined;
    }

    onSubmit( values, formApi ) {

    }

    form({handleSubmit, form}) {
        let post = getState( '$_POST', {} ),
            message = getState( 'message' );

        return (
            <form method={'post'} className={'login-form'} onSubmit={handleSubmit}>
                <Alert type={'error'} message={message} />
                <div>
                    <InputField {...{
                        formApi: form,
                        name: 'email',
                        label: <Lang text={'Email Address'} />,
                        value: post && post.email,
                        validate: this.validateEmail.bind(this)
                    }} />
                    <InputField {...{
                        formApi: form,
                        name: 'pwd',
                        label: <Lang text={'Password'} />,
                        required: true,
                        type: 'password'
                    }} />
                    <InputField {...{
                        formApi: form,
                        name: 'remember',
                        value: 1,
                        type: 'checkbox',
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
                     **/
                     Component.render('afterLoginForm', form, this )}
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