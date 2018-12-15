'use strict';

const path = require('path'),
    fs = require('fs'),
    _ = require('underscore');


/**
 * Read and scan files base on the given directory.
 *
 * @param {string} dir              Relative or absolute path of the directory to check.
 * @param {string} isObject         Whether to return the result as an array of object with file details.
 * @param {boolean} hierarchical    Whether to read include reading the sub-directories.
 */
const _readDir = function (dir) {
    dir = path.resolve( ABSPATH, dir );

    let hierarchical = arguments[1] || false,
        isObject = arguments[2] || hierarchical;

    return new Promise( ( res, rej ) => {
        fs.readdir( dir, async (err, files) => {
            if ( err || ! files ) {
                return rej(err);
            }

            let list = [];

            for ( let i = 0; i < files.length; i++ ) {
                let file = files[i],
                    filePath = path.resolve( dir, file ),
                    obj = path.parse(filePath);

                if ( ! isObject ) {
                    list.push(filePath);

                    continue;
                }

                if ( isObject ) {
                    let child = await _readDir( filePath, hierarchical, isObject )
                        .catch( () => {
                            return false;
                        });

                    if ( child ) {
                        obj.children = child;
                    }
                }

                list.push(obj);
            }

            res(list);
        });
    });
};
global.readDir = _readDir;

/**
 * Create new directory if it doesn't exist.
 *
 * @param {string} dir      Relative or absolute path of the directory to be created.
 * @param {string} chmod       The directory permission.
 */
const _mkDir = function(dir) {
    dir = path.resolve( ABSPATH, dir );

    let chmod = arguments[1] || '0777';

    return new Promise( (res, rej) => {
        fs.mkdir( dir, chmod, (err, suc) => {
            if( err ) rej(err);

            res(suc);
        });
    });
};
global.mkDir = _mkDir;

/**
 * Create and write new file if the given filename doesn't exist.
 *
 * @param filename
 * @param data
 * @returns {Promise<any>}
 * @private
 */
const _writeFile = function(filename, data) {
    filename = path.resolve(ABSPATH, filename);

    let chmod = arguments[2] || '0664';

    return new Promise( (res, rej) => {
        fs.writeFile( filename, data, err => {
            if ( err ) {
                rej(err);
            }

            res(true);
        });
    });
};
global.writeFile = _writeFile;