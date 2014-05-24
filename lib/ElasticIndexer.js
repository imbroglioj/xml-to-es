/** elasticIndexing
 *
 * author: jbroglio
 * Date: 5/23/14
 * Time: 11:44 AM
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

exports.ElasticIndexer = function (config) {
    var self = this;

    self.indexTypeUrl = config.index.url + '/' + config.index.type + '/';

    self.submitFile = function submitFile(f, cb, noRetry) {
        fs.readFile(f, {encoding: 'utf8'}, function (err, txt) {
            if (err) {
                logger.error("Could not read file: %s\n", f, err);
                if (cb) cb(err);
                return;
            }
            try {
                var json = JSON.parse(txt);

                if (Array.isArray(json)) {
                    function submitting() {
                        if (!json || !json.length) return cb ? setImmediate(cb) : null;
                        var obj = json.shift();
                        var sawErrors;
                        self.submitObject(obj, f,
                            function (err) {
                                if (err) sawErrors = err;
                                setImmediate(submitting);
                            });
                    }

                    submitting();
                } else self.submitObject(json, f, cb);
            } catch (e) {
                logger.error("Processing json from %s for submission.", f, e);
                if (noRetry) return cb ? cb(e) : null;
                var rx = /Unexpected end of input/;
                if (rx.test(e) || e.message && rx.test(e.message)) {
                    // try again in case file was not finished writing
                    self.submitFile(f, cb, true);
                }
            }
        });
    };

    self.submitObject = function submitObject(json, f, cb) {
        var id = json.id;
        if (!id) logger.error("No id in json object from file: %s. Cannot store", f);
        request.put(self.indexTypeUrl + id)
            .send(json)
            .on('error', function (err) { handleHttpError(err, "putting file to " + self.indexTypeUrl, cb); })
            .end(function (res) {
                if (!res.ok) {
                    logger.error("%s, %s, while posting from file: %s, to URL: %s, object: %s", res.status,
                            res.text || res.body, self.indexTypeUrl + id, f, util.inspect(json));
                    if (cb) cb(util.format("Error posting to %s: %s: %s", self.indexTypeUrl + id, res.status,
                            res.text || res.body));
                } else {
                    logger.trace("Stored document: %s", id);
                    if (cb) setImmediate(cb);
                }
            });
    };

    self.getDocumentCount = function getDocumentCount(cb) {
        // todo: for some reason, sending files to ES and asking for count immediately does not work;
        // probably something missing in the async calls that the http call (or the ES operation is not finishing
        // so add a delay for now.
        setTimeout(function () {
            request.get(self.indexTypeUrl + '_count')
                .on('error', function (err) { handleHttpError(err, "Getting document count", cb); })
                .end(function (res) {
                    if (!res.ok) {
                        logger.error('bad result from count: %s; %s', res.status, res.text || res.body);
                        if (cb) cb(res.status + ':' + res.text || res.body);
                        return;
                    } // else
                    if (cb) cb(null, res.body);
                });
        }, 1000);
    };

    function handleHttpError(err, where, cb) {
        var msg = util.format(where + ' : ' + err);
        logger.error(msg, err);
        return cb ? cb(msg) : null;
    }

    self.putMapping = function putMapping(cb) {
        if (config.index.mapping) {
            fs.readFile(config.index.mapping, function (err, txt) {
                if (err) {
                    logger.error("Could not read mapping file: %s. Attempting to continue.",
                        config.index.mapping, err);
                    return cb ? cb(err) : err;
                }
                var map = JSON.parse(txt);
                var mtype = config.index.type;
                if (map && !Object.keys(map).contains(mtype)) {
                    // This is fatal. catch it early.
                    throw new Error(util.format("index type declared in config as %s, but that type is not found in mapping: %j",
                        mtype, map));
                }
                var mapurl = config.index.url + '/_mapping/' + config.index.type;

                function putMap() {
                    request.put(mapurl)
                        .send(map)
                        .on('error', function (err) { handleHttpError(err, "putting map to: " + mapurl, cb); })
                        .end(function (res) {
                            if (!res.ok) {
                                logger.error("posting mapping to mapurl: %s, %s: %s: %s", mapurl,
                                    config.index.mapping, res.status,
                                        res.text || res.body);
                            }
                            if (cb) cb();
                        });
                }

                request.get(mapurl)
                    .on('error', function (err) { handleHttpError(err, "getting map from: " + mapurl, cb); })
                    .end(function (res) {
                        if (res.ok && res.body && Object.keys(res.body).length > 0) {
                            logger.warn("Replacing existing mapping with new or default mapping. Saving existing mapping to mapping.bak");
                            fs.writeFileSync(config.index.name + '-mapping.json.bak', res.body);
                            if (config.index.clean) request.del(mapurl)
                                .on('error',
                                function (err) { return handleHttpError(err, "deleting index type: " + mapurl, cb); })
                                .end(function (res) {
                                    if (!res.ok) {
                                        logger.warn("Not able to delete objects under mapping type:%s", mtype);
                                    }
                                    putMap();
                                });
                        } else { // else new index/mapping
                            logger.info("Creating new index <%s> with settings: %j",
                                config.index.url, config.index.settings);
                            request.put(config.index.url)
                                .send({settings: config.index.settings, mappings: map})
                                .on('error', function (err) {
                                    return handleHttpError(err, "creating index: " + config.index.url, cb);
                                })
                                .end(function (res) {
                                    if (!res.ok) {
                                        var msg = util.format("creating new index at createUrl: %s, %s: %s: %s",
                                            config.index.url,
                                            config.index.mapping, res.status,
                                                res.text || res.body);
                                        logger.error(msg);
                                        return cb ? cb(msg) : null;
                                    }
                                    if (cb) cb();
                                });
                        }
                    });
            });
        }
    };

    self.putFiles = function putFiles(paths, cb) {
        var files = paths.filter(function (f) {
            if (!fs.existsSync(f)) {
                logger.error("Input file|directory not found: %s.  (continuing if possible)", f);
                return false;
            }
            return true;
        }).reduce(function (accum, value) {
                if (fs.statSync(value).isDirectory()) {
                    return accum.concat(fs.readdirSync(value).map(function (f) {
                        if (!config.index.ext || path.extname(f) == config.index.ext) {
                            return path.join(value, f);
                        }
                    }))
                } else return accum.push(value);
            },
            []);
        var sawErrors = 0;

        function doOne() {
            if (!files || !files.length) return cb ? setImmediate(cb) : null;
            var file = files.shift();
            self.submitFile(file,
                function (err) {
                    if (err) {
                        logger.error("Saw errors in file %s", file);
                        sawErrors++;
                        return setImmediate(doOne);
                    }
                    logger.info("successfully submitted: %s", file);
                    return setImmediate(doOne);
                });
        }

        doOne();
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

    // config.query.url is
    config.index.url = config.index.url ||
        util.format('http://%s:%d/%s', config.index.server, config.index.port, config.index.name);
    if (argv.level) logger.setLevel(argv.level);
    config.logger = config.logger || logger;
    config.index.server = config.index.server || "localhost";
    config.index.port = config.index.port || 9200;
    return config;
};
