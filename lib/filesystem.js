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
 * @param {array} types             The types of file that must be selected.
 *
 * @return {array}
 */
const readDir = function (dir) {
    dir = path.resolve( ABSPATH, dir );

    let hierarchical = arguments[1] || false,
        isObject = arguments[2] || hierarchical,
        types = arguments[3] || [];

    return new Promise( ( res, rej ) => {
        fs.readdir( dir, async (err, files) => {
            if ( err || ! files ) {
                return rej(err);
            }

            let list = [];

            for ( let i = 0; i < files.length; i++ ) {
                let file = files[i],
                    filePath = path.resolve( dir, file ),
                    obj = path.parse(filePath),
                    exclude = /(node_modules|\.sass-cache|\.idea|Gruntfile.js|\.git|sass)/g;

                if ( exclude.test(file) ) {
                    continue;
                }

                let ext = obj.ext.replace( /\./g, '' ),
                    isDir = ! /\./g.test(obj.ext);

                if ( types && ! isDir && ! _.contains( types, ext ) ) {
                    continue;
                }


                if ( ! isObject ) {
                    list.push(filePath);

                    continue;
                }

                if ( isObject ) {
                    obj.filePath = filePath;

                    if ( isDir ) {
                        let child = await readDir( filePath, isObject, hierarchical, types );

                        if ( child.length ) {
                            list = list.concat(child);
                        }
                    }

                    if ( ! isDir ) {
                        list.push(obj);
                    }
                } else {
                    if ( ! isDir ) {
                        list.push(filePath);
                    }
                }
            }

            res(list);
        });
    });
};
setGlobalVar( 'readDir', readDir );

/**
 * Create new directory if it doesn't exist.
 *
 * @param {string} dir      Relative or absolute path of the directory to be created.
 * @param {string} chmod       The directory permission.
 */
const mkDir = function(dir) {
    dir = path.resolve( ABSPATH, dir );

    let chmod = arguments[1] || '0777';

    return new Promise( (res, rej) => {
        fs.mkdir( dir, chmod, err => {
            if( err ) rej(err);

            res(true);
        });
    });
};
setGlobalVar( 'mkDir', mkDir );

/**
 * Delete the given directory and all it's files and sub-directories.
 *
 * @param dir
 * @returns {Promise<* | never>}
 * @private
 */
const rmDir = dir => {
    dir = path.resolve( ABSPATH, dir );

    return _readDir( dir, true, true )
        .then( async files => {
            for ( let i = 0; i < files.length; i++ ) {
                let filePath = path.resolve(dir, files[i]);

                await fs.unlink( filePath );
            }

            return new Promise( (res, rej) => {
                fs.rmdir(dir, err => {
                    if( err ) {
                        rej(err);
                    }

                    res(true);
                });
            });
        });
};
setGlobalVar( 'rmDir', rmDir );

/**
 * Create and write new file if the given filename doesn't exist.
 *
 * @param filename
 * @param data
 * @returns {Promise<any>}
 * @private
 */
const writeFile = function(filename, data) {
    filename = path.resolve(ABSPATH, filename);

    let chmod = arguments[2] || '0664';

    return new Promise( (res, rej) => {
        fs.writeFile( filename, data, {mode: chmod}, err => {
            if ( err ) {
                rej(err);
            }

            res(true);
        });
    });
};
setGlobalVar( 'writeFile', writeFile );

const readFile = (file, encoding) => {
    file = path.resolve(ABSPATH, file);
    encoding = encoding || 'utf8';

    let options = {encoding: encoding};

    return promise( (res, rej) => {
        fs.readFile( file, options, (err, data) => {
            if(err) rej(err);

            res(data);
        });
    });
};
setGlobalVar( 'readFile', readFile );