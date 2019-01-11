'use strict';

import React from 'react';
import Template from '../component/template';
import {addComponent} from "../component/component";

class SelectDatabase extends Template {
    render() {
        return (
            <section>
                <header>
                    <p>A NodeJs open source framework for web and mobile application.</p>
                </header>
                <div>
                    <h2>CHOOSE YOUR DATABASE</h2>

                    <div>
                        <div>
                            <h3>MySQL</h3>
                            <p>The world's most popular open source database.</p>
                            <a href={'/db/mysql'} className={'button'}>Start</a>
                        </div>
                        <div>
                            <h3>MongoDB</h3>
                            <p>An scallable, flexible document model database.</p>
                            <a href={'/db/mongodb'} className={'button'}>Start</a>
                        </div>
                    </div>
                </div>
            </section>
        )
    }
}
addComponent( 'SelectDatabase', <SelectDatabase/> );