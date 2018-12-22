'use strict';

const assert = require('chai').assert;

require('../lib/load');

const {DatabaseManager} = require('../lib/db');

let config = {
    database: 'mysql',
    dbName: 'centriojs_test',
    dbUser: 'root',
    dbPass: 'root',
    secretKey: '52071d25e7ec91dd36bdd5166f01659f'
};

describe('MySQL: Install database tables', () => {
    global.dbManager = DatabaseManager(config);

    it('Should install `users` table.', done => {
        let userQuery = dbManager.execQuery('users');

        let columns = [
            '`ID` BIGINT(20) NOT NULL PRIMARY KEY AUTO_INCREMENT',
            '`display` VARCHAR(30) NOT NULL',
            '`email` VARCHAR(50) NOT NULL',
            '`pass` VARCHAR(100) NOT NULL',
            '`group` VARCHAR(50) NOT NULL',
            '`dateRegistered` DATETIME DEFAULT CURRENT_TIMESTAMP',
            'Index (`ID`, `email`, `group`)'
        ];

        let sql = 'CREATE TABLE IF NOT EXISTS `' + userQuery.table + '` (' + columns.join(',') + ')engine=InnoDB charset=DEFAULT';

        userQuery.query( sql )
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should install user_settings table', done => {
        let userSettings = dbManager.execQuery('user_settings');

        let columns = [
            '`userId` BIGINT(20) NOT NULL PRIMARY KEY',
            '`name` VARCHAR(50) NOT NULL',
            '`value` LONGTEXT',
            'Index (`userId`, `name`)'
        ];

        let sql = 'CREATE TABLE IF NOT EXISTS `' + userSettings.table + '` (' + columns.join(',') + ')engine=InnoDB charset=DEFAULT';

        userSettings.query( sql )
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should create settings table', done => {
        let settingQuery = dbManager.execQuery('settings');

        let columns = [
            '`name` VARCHAR(60) NOT NULL PRIMARY KEY',
            '`value` LONGTEXT',
            'Index (`name`)'
        ];

        let sql = 'CREATE TABLE IF NOT EXISTS `' + settingQuery.table + '` (' + columns.join(',') + ')engine=InnoDB charset=DEFAULT';

        settingQuery.query(sql)
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should install presets table', done => {
        let presetQuery = dbManager.execQuery('presets');

        let columns = [
            '`ID` BIGINT(20) NOT NULL PRIMARY KEY AUTO_INCREMENT',
            '`name` VARCHAR(60) NOT NULL UNIQUE',
            '`type` ENUM ("template", "module", "menu") DEFAULT "template"',
            '`location` VARCHAR(100) NOT NULL',
            '`contentType` VARCHAR(60) NOT NULL DEFAULT "global"',
            '`properties` LONGTEXT',
            '`modules` LONGTEXT',
            '`menu` LONGTEXT',
            'Index (`ID`, `name`, `type`)'
        ];

        let sql = 'CREATE TABLE IF NOT EXISTS `' + presetQuery.table + '` (' + columns.join(', ') + ')engine=InnoDB charset=DEFAULT';

        presetQuery.query(sql)
            .then( ok => {
                assert.isOk( ok, true );
                done();
            })
            .catch(done);
    });

    it('Should close database.', done => {
        dbManager.close();
        done();
    });
});