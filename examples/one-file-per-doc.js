/** one-file-per-doc
 *
 * author: jbroglio
 * Date: 5/12/14
 * Time: 12:01 PM
 */

var core = require('xml-to-es.js'),
    Parser = core.Parser,
    Generator = core.Generator,
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

function createOutputStreamFromId(infile, json, config) {
    return fs.createWriteStream(path.join(config.destDir, json.id + '-' + path.basename(infile)
        .replace(path.extname(infile), config.targetFileExt)), {encoding: 'utf8'});
}

var fileExt = '.json';

process.on('uncaughtException', function (err) {
    logger.error("Uncaught error: " + util.inspect(err, {depth: null}));
});

if (require.main === module) {
    var pfile = argv.config;
    if (!/\.js$/.test(pfile)) pfile += '.js';
    var infile = argv._[0];
    var config = require(path.resolve(pfile));
    var parser = new Parser(config);
    var generator = new Generator(config);
    if (config.targetFileExt && !/^\./.test(config.targetFileExt)) config.targetFileExt = '.' + config.targetFileExt;

    config.destDir = path.resolve(config.destDir);
    if (!fs.existsSync(config.destDir)) fs.mkdir(config.destDir);

    if (!config.flatten) config.flatten = [];
    if (!config.flatten.contains('#')) config.flatten.unshift('#');

    logger.setLevel(argv.level || 'DEBUG');
    logger.debug("Starting main");
    var input = fs.createReadStream(infile, 'utf8'); // should this be bin?
    var xml = '';
    input.on('data', function (chunk) {
        logger.trace("Digested chunk");
        xml += chunk;
    });
    var gen;
    switch (config.fmt) {
        case 'html':
            gen = generator.generateHtml;
            break;
        case 'json':
        default:
            gen = generator.generateJson;
    }

    input.on('end', function () {
        parser.processXmlDocs(xml,
            function (json) {
                gen(createOutputStreamFromId(infile, json, config), result);
            });
    });
}