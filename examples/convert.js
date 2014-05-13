/** one-file-per-doc
 *
 * author: jbroglio
 * Date: 5/12/14
 * Time: 12:01 PM
 */

var core = require('../src/xml-to-es'),
    logger = core.logger,
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    argv = require('optimist')
        .usage('USAGE: $0 INPUT_FILE --config PATH_TO_PROPERTIES_JS [--level LOGLEVEL]')
        .demand([1, 'config'])
        .string('config')
        .argv

    ;


var fileExt = '.json';

process.on('uncaughtException', function (err) {
    logger.error("Uncaught error: " + util.inspect(err, {depth: null}));
});

if (require.main === module) {
    var config = core.resolveOptions(config);
    var parser = new core.Parser(config);
    config.infiles.forEach(function(infile){
        var input = fs.createReadStream(infile, 'utf8'); // should this be bin?
        var xml = '';
        logger.debug("Starting main");
        input.on('data', function (chunk) {
            logger.trace("Digested chunk");
            xml += chunk;
        });

        input.on('end', function () {
            parser.processXmlDocs(xml, config.output.generator);
        });
    });
}

