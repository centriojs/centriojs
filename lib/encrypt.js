'use strict';

const crypto = require('crypto'),
    encoding = 'aes-256-cbc',
    type = 'base64';

const _ = require('./mixin');

const exp = module.exports = {};

const getSecretKey = () => {
    return dbManager.config.secretKey;
};

exp.randomSalt = ( bytes, length, format ) => {
    bytes = bytes || 16;
    length = length || 64;
    format = format || type;

    return crypto.randomBytes(bytes)
        .toString(format)
        .slice( 0, length );
};

exp.encrypt = async ( str ) => {
    let SECRET_KEY = getSecretKey();

    if ( ! SECRET_KEY ) {
        return reject('Your application secret key is either corrupted or cannot be read.');
    }

    str = str.toString();

    return new Promise( (res, rej) => {
        let iv = crypto.randomBytes(16),
            secretKey = Buffer.from(SECRET_KEY),
            cipher = crypto.createCipheriv( encoding, secretKey, iv );

        cipher.on('readable', () => {
            let key = cipher.read();

            if ( ! key ) {
                return rej('Something went wrong. Unable to encrypt the given key.');
            }

            key = iv.toString(type) + ';)' + key.toString(type);
            res(key);
        });
        cipher.write(str);
        cipher.end();
    });
};

exp.decrypt = async (hash) => {
    let SECRET_KEY = getSecretKey();

    if ( ! SECRET_KEY ) {
        return reject('Your application secret key is either corrupted or cannot be read.');
    }

    return new Promise( (res, rej) => {
        let _hash = hash.split(';)'),
            secretKey = Buffer.from(SECRET_KEY),
            iv, encrypt;

        iv = Buffer.from(_hash.shift(), type);
        encrypt = Buffer.from(_hash.join(';)'), type);

        let decipher = crypto.createDecipheriv( encoding, secretKey, iv );

        decipher.on('readable', () => {
            let match = decipher.read();

            if(!match) rej(false);

            match = match.toString();

            res(match);
        });
        decipher.write(encrypt);
        decipher.end();
    });
};

exp.compare = async ( str, hash ) => {
    let SECRET_KEY = getSecretKey();

    if ( ! SECRET_KEY ) {
        return reject('Your application secret key is either corrupted or cannot be read.');
    }

    return new Promise( (res, rej) => {
        if ( ! SECRET_KEY ) rej('Your app .secret key is either missing or corrupted!');

        let _hash = hash.split(';)'),
            secretKey = Buffer.from(SECRET_KEY),
            iv, encrypt;

        iv = Buffer.from(_hash.shift(), type);
        encrypt = Buffer.from(_hash.join(';)'), type);

        let decipher = crypto.createDecipheriv( encoding, secretKey, iv );
        decipher.on( 'readable', () => {
            let match = decipher.read();

            if(!match) rej(false);

            match = match.toString();

            console.log(match);

            if(!_.isEqual(str, match)) rej(false);

            res(true);
        });
        decipher.write(encrypt);
        decipher.end();
    });
};