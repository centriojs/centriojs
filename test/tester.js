let path = require('path');

global.ABSPATH = path.resolve( __dirname, '../../demo/app-mysql');
require('./mysql/config');
require('../lib/load');

console.time('z');
getCurrentTheme()
.then( info => {
    console.timeEnd('z');
    console.log(info);
})
.catch();