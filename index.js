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

exports.Generators = require(path.resolve(__dirname,'lib/Generators.js')).Generators;
exports.Parser = parser.Parser;
exports.resolveParseOptions = parser.resolveClOptions;
exports.collectFiles = parser.collectFiles;
exports.ElasticIndexer = indexer.ElasticIndexer;
exports.resolveIndexOptions = indexer.resolveClOptions;
var Logger = require(path.resolve(__dirname,'lib/cheap-logger.js')).Logger;
exports.logger=new Logger();
exports.optimist = require('optimist');