'use strict';

const sax = require('sax');

module.exports = template => {
    template = '<div>' + template + '</div>';

    let parser = sax.parser(true, {trim:true}),
        html = {},
        pos = 0;

    return new Promise( res => {

        let tags, parent;

        parser.onopentag = node => {
            node.id = pos;
            node.children = {};
            html[pos] = node;

            pos += 1;

            tags = parser.tags;

            if (tags.length <= 1) {
                parent = node;

                return null;
            }

            parent = tags[0];

            tags.slice(1).map(tag => {
                let id = tag.id;

                if ( !parent.children[id] ) {
                    parent.children[id] = tag;
                }

                if (!tag.isSelfClosing) {
                    parent = tag;
                }
            });
        };

        parser.ontext = text => {
            parent.children[pos] = {name: '#text', text: text, id: pos, children: {}};

            pos += 1;
        };

        parser.onend = () => {
            let children = html[0].children;

            res(children);
        };

        parser.write(template);
        parser.end();
    });
};