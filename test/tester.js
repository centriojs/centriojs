const fs = require('fs'),
    path = require('path');

let f1 = path.resolve( __dirname, './ambot.js' ),
    f2 = require(f1);
console.log(f2);