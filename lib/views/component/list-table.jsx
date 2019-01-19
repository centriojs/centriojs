'use strict';

import React from 'react';
import Template from './template';
import {Filter} from "./hooks";
import _ from 'underscore';

export default class ListTable extends Template {
    constructor(props) {
        super(props);

        this.state = {
            id: props.tableId,
            items: props.items || [],
            columns: props.columns || {},
            totalItems: props.totalItems || 0
        };
    }

    getColumns() {
        return Filter.apply( `${this.state.tableId}Columns`, this.state.columns || {}, this );
    }

    tHead() {
        let currentColumns = this.getColumns(),
            columns = [];

        _.keys( currentColumns ).map( key => {
            let label = currentColumns[key],
                attr = {
                    className: 'column-' + key,
                    key: _.uniqueId('column')
                };

            columns.push(<th {...attr}>{label}</th>);
        });

        return <tr scope="row">{columns}</tr>;
    }

    rowItems() {
        let items = [];

        this.state.items.map( item => {
            let attr = {
                    key: _.uniqueId('tr')
                };

            if ( item.ID ) {
                attr.id = item.ID;
            } else if ( item.id ) {
                attr.id = item.id;
            }

            items.push(<tr {...attr}><td>ITEM HERE</td></tr>);
        });

        return items;
    }

    render() {
        if ( this.hasError() ) {
            return null;
        }

        let attr = {
            className: 'list-table list-table-' + this.tableId
        };

        return (
            <table {...attr}>
                <thead>{this.tHead()}</thead>
                <tbodh>{this.rowItems()}</tbodh>
            </table>
        );
    }
}