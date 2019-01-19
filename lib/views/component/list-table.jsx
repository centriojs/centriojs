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
            columns: props.columns || {}
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
        let items = [],
            columns = this.getColumns();

        this.state.items.map( item => {
            let attr = {
                    key: _.uniqueId('tr')
                };

            if ( item.ID ) {
                attr.id = item.ID;
            } else if ( item.id ) {
                attr.id = item.id;
            }

            let itemColumns = [];

            _.keys(columns).map( key => {
                let column = null,
                    columnKey = 'column_' + key;

                // Check properties first
                if ( this.props[columnKey] ) {
                    column = this.props[columnKey].apply( this.props[columnKey], [item, this] );
                } else if ( this[columnKey] ) {
                    column = this[columnKey].apply( this, [item] );
                } else {
                    column = Filter.apply( `${this.state.tableId}_columnValue`, '', item, this );
                }

                let columnAttr = {
                    className: 'column-' + key,
                    key: _.uniqueId('column' )
                };

                itemColumns.push(<td {...columnAttr}>{column}</td>);
            });

            items.push(<tr {...attr}>{itemColumns}</tr>);
        });

        return items;
    }

    column_ID(item) {
        return <input type={'checkbox'} value={item.ID} />;
    }

    render() {
        if ( this.hasError() ) {
            return null;
        }

        let attr = {
            className: 'list-table list-table-' + this.state.tableId
        };

        return (
            <table {...attr}>
                <thead>{this.tHead()}</thead>
                <tbodh>{this.rowItems()}</tbodh>
            </table>
        );
    }
}