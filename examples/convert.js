/** one-file-per-doc
 *
 * author: jbroglio
 * Date: 5/12/14
 * Time: 12:01 PM
 */

var core = require('xml-to-es'),
    logger = core.logger,
    fs = require('fs'),
    util = require('util')
    ;

process.on('uncaughtException', function (err) {
    logger.error("Uncaught error: " + util.inspect(err, {depth: null}) +
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
    parser.processFiles();
}

