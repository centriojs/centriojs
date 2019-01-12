const {encrypt, decrypt} = require('../lib/encrypt');

let pass = 124356;

encrypt(pass)
.then( hash => {
    console.log(hash);

    return decrypt(hash);
})
    .then( p => {
        console.log(p);
    })
    .catch(err => {
        console.log(err);
    });