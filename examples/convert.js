/** one-file-per-doc
 *
 * author: jbroglio
 * Date: 5/12/14
 * Time: 12:01 PM
 */

var path = require('path'),
// CHANGE next item to require('xml-to-es') if you copy file to another directory and xml-to-es is in node_modules
    core = require(path.resolve(__dirname,'../index.js')),
    log = core.log,
    fs = require('fs'),
    util = require('util')
    ;

process.on('uncaughtException', function (err) {
    log.error("Uncaught error: " + util.inspect(err, {depth: null}) +
    err.stack ? err.stack : '-- no stack');
});

if (require.main === module) {
    var argv = require('optimist')
        .usage('USAGE: $0 INPUT_FILES --config PATH_TO_PROPERTIES_JS [--level LOGLEVEL]')
        .demand([1, 'config'])
        .string('config')
        .argv;

    var config = core.resolveParseOptions(argv);
    var parser = new core.Parser(config);
    parser.processFiles(config.output.callback);
}

