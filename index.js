/** index
 *
 * author: jbroglio
 * Date: 5/23/14
 * Time: 11:40 AM
 */

var path = require('path'),
    parser = require(path.resolve(__dirname,'lib/xml-to-es.js')),
    indexer = require(path.resolve(__dirname,'lib/ElasticIndexer.js')),
    cheapLogger = require(path.resolve(__dirname,'lib/cheap-logger.js'))
    ;

exports.Parser = parser.Parser;
exports.resolveParseOptions = parser.resolveOptions;

exports.ElasticIndexer = indexer.ElasticIndexer;
exports.resolveIndexOptions = indexer.resolveOptions;

exports.logger = cheapLogger.logger;
exports.optimist = require('optimist');