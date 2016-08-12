/** index-es-config.js
 *
 * author: jbroglio
 * Date: 5/19/14
 * Time: 4:04 PM
 */

var path = require('path');
var config = require(path.resolve(__dirname, 'lewis-input-config'));
var doneOne;
config.index = {
    name: 'testxml__',
    type: 'doc',  // must match one of the types in mapping
    settings: {index: {number_of_shards: 1}},
    mapping: path.join(__dirname, './mapping.json'),
    ext: '.json',
    server: 'localhost',
    port: 9200
};

config.output = {
    fmt:"json",
    noFile:true,
    generator: {
        type: 'json',
        // make sure that we have the final version of the config
        setConfig: function(c){
            config = c;
        },
        fn: function (json, cb) {
            if (json == ':done') {
                config.log.info("Indexing Done");
                return cb ? cb() : null;
            }

            function indexit() {
                config.indexer.submitObject(json, config.input.currentFile, cb);
            }

            if (!doneOne && config.index.clean) {
                config.indexer.deleteIndex(config.index.url + '/' + config.index.type,
                    function (err) {
                        if (err) config.log.warn("Error deleting old index: ", err);
                        indexit();
                    })
            } else indexit();
            doneOne = true;
        }
    }
};


module.exports = config;