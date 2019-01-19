'use strict';

import React from 'react';
import ListTable from '../component/list-table';
import {addComponent} from "../component/component";
import {getState} from "../component/router";

export default class UsersListTable extends ListTable {
    constructor(props) {
        super(props);

        this.state.tableId = 'users';
        this.state.items = getState('users', [] );
        this.state.columns = {
            ID: 'ID',
            name: 'Name',
            email: 'Email',
            group: 'Group',
            date: 'Registered'
        };
    }
}
addComponent( 'UsersListTable', <UsersListTable/> );