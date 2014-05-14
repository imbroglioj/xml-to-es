/** indexFiles
 *
 * author: jbroglio
 * Date: 5/14/14
 * Time: 1:49 PM
 */

// An example script for sending files to Elastic Search at the standard port
// The mapping file is appropriate for the Lewis Reuters corpus

var request = require('superagent')
    , fs = require('fs')
    , path = require('path')
    , util = require('util')
    , logger = require('../src/cheap-logger.js').logger
    ;

var argv;
var server = 'localhost';
var port = 9200;
var index = 'testxml';
var url;

function submitFile(f, cb) {
    fs.readFile(f, {encoding: 'utf8'}, function (err, txt) {
        if (err) {
            logger.error("Could not read file: %s\n", f, err);
            if (cb) cb(err);
            return;
        }
        try {
            var json = JSON.parse(txt)
            if (Array.isArray(json)) {
                var sawErrors;
                return json.forEach(function (obj) {
                    submitObject(obj, f, function (err) {if (err) sawErrors = err});
                    if (cb) cb(sawErrors);
                });
            } // else
            submitObject(json, f, cb);
        } catch (e) {
            logger.error("Processing json from %s for submission.", f, err)
        }
    });
}

function submitObject(json, f, cb) {
    var id = json.id;
    if (!id) logger.error("No id in json object from file: %s. Cannot store", f);
    request.put(url + id)
        .send(json)
        .end(function (res) {
            if (!res.ok) {
                logger.error("%s, %s, while posting from file: %s, to URL: %s, object: %s", res.status,
                        res.text || res.body, url+id, f, util.inspect(json));
                if (cb) cb(util.format("Error posting to %s: %s: %s", url+id, res.status, res.text || res.body));
            } else {
                logger.trace("Stored document: %s", id);
                if (cb) cb();
            }
        });
}

function putMapping(argv) {
    var mtype = argv.type;
    if (['false', 'none', 'null'].indexOf(argv.mapping.toLowerCase()) < 0) {
        fs.readFile(argv.mapping, function (err, txt) {
            if (err) {
                return logger.error("Could not read mapping file: %s. Attempting to continue.",
                    argv.mapping, err);
            }
            var map = JSON.parse(txt);
            var mapType = Object.keys(map)[0];
            if (mtype && mtype != mapType) map = { mtype: map};
            if (!mtype) mtype = mapType;
            url = util.format('http://%s:%d/%d/%d/', server, port, index, mtype);
            var mapurl = url+ '_mapping';
            request.get(mapurl)
                .end(function (res) {
                    if (res.ok && res.body && Object.keys(res.body).length > 0) {
                        logger.warn("Replacing existing mapping with new or default mapping. Saving existing mapping to mapping.bak");
                        fs.writeFileSync(index + '-mapping.json.bak', res.body);
                    }
                    request.put(mapurl)
                        .send(map)
                        .end(function (res) {
                            if (!res.ok) {
                                logger.error("posting mapping %s: %s: %s", argv.mapping, res.status,
                                        res.text || res.body);
                            }
                        });
                });
        });
    }
}

if (require.main === module) {
    argv = require('optimist')
        .usage('USAGE: $0 INPUT_FILES  [ --ext FILE_EXTENSION [--mapping MAPPING_FILE -type MAPPING_TYPE [--level LOGLEVEL]]]')

        .demand([1])
        .string('mapping')
        .string('level')
        .default({
            mapping: path.join(__dirname, 'mapping.json'),
            level: "debug"
        })
        .describe({
            mapping: "json mapping file for Elastic Search index. false|none|null all leave index mapping unchanged.",
            mapping_type: "mapping type for ES. Will be added to mapping json if necessary, \n  or extracted from mapping if not present here.",
            level: "log level",
            ext: 'If INPUT_FILES contains a directory, then FILE_EXTENSION will be used to select files from that directory.'
        })
        .argv;
    putMapping(argv);
    var files = argv._[0].split([',']);
    files.filter(function (f) {
        if (!fs.existsSync(f)) {
            logger.error("Input file|directory not found: %s.  (continuing if possible)", f);
            return false;
        }
        return true;
    }).forEach(function (x) {
        if (fs.statSync(x).isDirectory()) {
            fs.readdir(x, function (err, files) {
                var sawErrors;
                files.forEach(function (f) {
                    if (err) {
                        return logger.error("Could not read directory: %s\n", f, err);
                    }
                    if (!argv.ext || path.extname(f) == argv.ext) {
                        var file = path.join(x, f);
                        submitFile(file,
                            function (err) {
                                if (err) return logger.error("Saw errors in file %s", file);
                                logger.info("successfully submitted: %s", file);
                            });
                    }
                });
            });
        } else {
            submitFile(x,
                function (err) {
                    if (err) return logger.error("Saw errors in file %s", x);
                    logger.info("successfully submitted: %s", x);
                });
        }
    });
}
