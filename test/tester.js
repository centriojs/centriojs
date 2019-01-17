let path = require('path');

global.ABSPATH = path.resolve( __dirname, '../../demo/app-mysql');
require('./mysql/config');
require('../lib/load');

getCurrentTheme()
.then( info => {
    //console.log(info);
})
.catch();