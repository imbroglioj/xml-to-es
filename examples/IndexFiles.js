/** indexFiles
 *
 * author: jbroglio
 * Date: 5/14/14
 * Time: 1:49 PM
 */

// An example script for sending files to Elastic Search at the standard port
// The mapping file is appropriate for the Lewis Reuters corpus

var path = require('path')
// CHANGE next item to require('xml-to-es') if you copy file to another directory and xml-to-es is in node_modules
    , core = require(path.resolve(__dirname,'../index.js'))
    ;

exports.IndexFiles = core.ElasticIndexer;  // v0.1.0 API back compatible; change for v0.2.0
exports.ElasticIndexer = core.ElasticIndexer;
exports.resolveOptions = core.resolveIndexOptions;

if (require.main === module) {
    var argv = require('optimist')
        .usage('USAGE: $0 INPUT_FILES --config INDEX_CONFIG [-- clean [false] [--level LOGLEVEL]')
        .demand([1, 'config'])
        .boolean('clean')
        .string('level')
        .default({
            level: "debug"
        })
        .describe({
            config: 'config file (see examples)',
            clean: 'Should we delete the files in the index/type first? [overrides value in config file]',
            level: "log level"
        })
        .argv;
    var config = core.resolveIndexOptions(argv);
    var indexer = new core.ElasticIndexer(config);
    indexer.putMapping(function (err) {
        if (err) return; // already logged
        indexer.putFiles(argv._[0].split([',']), function (err) {
            // err signaled already
            if (err) return;
            indexer.getDocumentCount(function (err, res) {
                if (!err) console.log('Index count info: ' + res.count);
            });
        });
    });
}
