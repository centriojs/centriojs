let vm = require('vm');

require('../lib/load');

let args = {
    require: require,
    output: ''
};

Object.keys(global).map( key => {
    args[key] = global[key];
});

let sandbox = vm.createContext(args);

vm.runInContext(`
'use strict';

output = typeof deleteEndPoint;

`, sandbox );

console.log(sandbox.output);