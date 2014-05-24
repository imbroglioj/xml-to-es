/** index-es-config.js
 *
 * author: jbroglio
 * Date: 5/19/14
 * Time: 4:04 PM
 */

var path = require('path');

var config = {
    index: {
        name: 'testxml__',
        type: 'doc',  // must match one of the types in mapping
        settings: {index: {number_of_shards: 1}},
        mapping: path.join(__dirname, './mapping.json'),
        ext: '.json',
        server: 'localhost',
        port: 9200
    }
};

module.exports = config;