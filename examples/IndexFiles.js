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
    , logger = require('../lib/cheap-logger.js').logger
    ;

if (!Array.prototype.contains) {
    Object.defineProperty(Array.prototype, 'contains', {value: function (item) {return this.indexOf(item) >= 0;}});
}

exports.IndexFiles = function (config) {
    var self = this;

    self.submitFile = function submitFile(f, cb) {
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
                        self.submitObject(obj, f, function (err) {if (err) sawErrors = err});
                        if (cb) cb(sawErrors);
                    });
                } // else
                self.submitObject(json, f, cb);
            } catch (e) {
                logger.error("Processing json from %s for submission.", f, e)
            }
        });
    };

    self.submitObject = function submitObject(json, f, cb) {
        var id = json.id;
        if (!id) logger.error("No id in json object from file: %s. Cannot store", f);
        request.put(config.index.url + id)
            .send(json)
            .end(function (res) {
                if (!res.ok) {
                    logger.error("%s, %s, while posting from file: %s, to URL: %s, object: %s", res.status,
                            res.text || res.body, config.index.url + id, f, util.inspect(json));
                    if (cb) cb(util.format("Error posting to %s: %s: %s", config.index.url + id, res.status,
                            res.text || res.body));
                } else {
                    logger.trace("Stored document: %s", id);
                    if (cb) cb();
                }
            });
    };

    self.getDocumentCount = function getDocumentCount(cb) {
        request.get(config.index.url + '_count')
            .query({q: '*'})
            .end(function (res) {
                if (!res.ok) {
                    logger.error('bad result from count: %s; %s', res.status, res.text || res.body);
                    if (cb) cb(res.status + ':' + res.text || res.body);
                    return;
                } // else
                if (cb) cb(null, res.body);
            });
    };

    self.putMapping = function putMapping() {
        if (config.index.mapping) {
            fs.readFile(config.index.mapping, function (err, txt) {
                if (err) {
                    return logger.error("Could not read mapping file: %s. Attempting to continue.",
                        config.index.mapping, err);
                }
                var map = JSON.parse(txt);
                var mtype = config.index.type;
                if (map && !Object.keys(map).contains(mtype)) {
                    // This is fatal. catch it early.
                    throw new Error(util.format("index type declared in config as %s, but that type is not found in mapping: %j",
                        mtype, map));
                }
                var mapurl = config.index.url + '_mapping';
                request.get(mapurl)
                    .end(function (res) {
                        if (res.ok && res.body && Object.keys(res.body).length > 0) {
                            logger.warn("Replacing existing mapping with new or default mapping. Saving existing mapping to mapping.bak");
                            fs.writeFileSync(config.index.name + '-mapping.json.bak', res.body);
                            if (config.index.clean) request.delete(mapurl)
                                .end(function (res) {
                                    if (!res.ok) {
                                        logger.warn("Not able to delete objects under mapping type:%s", mtype);
                                    }
                                    request.put(mapurl)
                                        .send(map)
                                        .end(function (res) {
                                            if (!res.ok) {
                                                logger.error("posting mapping to mapurl: %s, %s: %s: %s", mapurl,
                                                    config.index.mapping, res.status,
                                                        res.text || res.body);
                                            }
                                        });
                                });
                        } else { // else new index/mapping
                            request.put(config.index.createUrl)
                                .send({settings: config.index.settings, mappings: map})
                                .end(function (res) {
                                    if (!res.ok) {
                                        logger.error("creatign new index at createUrl: %s, %s: %s: %s",
                                            config.index.createUrl,
                                            config.index.mapping, res.status,
                                                res.text || res.body);
                                    }
                                });
                        }
                    });
            });
        }
    };

    self.putFiles = function putFiles(files) {
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
                        if (!config.index.ext || path.extname(f) == config.index.ext) {
                            var file = path.join(x, f);
                            self.submitFile(file,
                                function (err) {
                                    if (err) return logger.error("Saw errors in file %s", file);
                                    logger.info("successfully submitted: %s", file);
                                });
                        }
                    });
                });
            } else {
                self.submitFile(x,
                    function (err) {
                        if (err) return logger.error("Saw errors in file %s", x);
                        logger.info("successfully submitted: %s", x);
                    });
            }
        });
    };
};

function deepExtend(target, src) {
    util._extend(target, src);
    Object.keys(src).forEach(function (key) {
        if (typeof src[key] === 'object') deepExtend(target[key], src[key]);
    });
    return target;
}

exports.resolveOptions = function resolveOptions(argv, overrides) {
    var pfile = argv.config;
    if (!/\.js$/.test(pfile)) pfile += '.js';
    // be careful because require caches the object and you can't safely reuse it.
    var config = deepExtend({}, require(path.resolve(process.cwd(), pfile)));
    if (typeof argv.clean !== 'undefined') config.index.clean = argv.clean;
    if (overrides) {
        // note: only good for one-level overrides:
        // config.output = {foo, bar} and overrides.output={baz} => config.output = {foo, baz, bar}
        // but config.output = {foo:{x,y}, bar} and overrides.output={foo:{z}} => config.output = {foo:{z}, baz, bar}
        Object.keys(overrides).forEach(function (x) {
            if (config[x]) deepExtend(config[x], overrides[x]);
            else config[x] = overrides[x];
        });
    }
    config.index.url = config.index.url
        || util.format('http://%s:%d/%s/%s/', config.index.server, config.index.port, config.index.name, config.index.type);
    config.index.createUrl = config.index.createUrl
        || util.format('http://%s:%d/%s', config.index.server, config.index.port, config.index.name);
    if (argv.level) logger.setLevel(argv.level);
    config.logger = config.logger || logger;
    config.index.server = config.index.server || "localhost";
    config.index.port = config.index.port || 9200;
    return config;
};

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
    var config = resolveOptions(argv);
    var indexFiles = new exports.IndexFiles(config);
    indexFiles.putMapping();
    indexFiles.putFiles(argv._[0].split([',']));
    indexFiles.getDocumentCount(function (err, res) {
        if (!err) console.log('Index count info: ' + res.count);
    });
}
