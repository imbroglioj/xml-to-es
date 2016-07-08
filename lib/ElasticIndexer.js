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
  , Logger = require('../lib/cheap-logger.js').Logger
  , logger = new Logger()
  ;

if (!Array.prototype.contains) {
  Object.defineProperty(Array.prototype, 'contains', {value: function (item) {return this.indexOf(item) >= 0;}});
}

exports.ElasticIndexer = function (config) {
  var self = this;

  self.indexTypeUrl = config.index.url + '/' + (config.index.type ? config.index.type + '/' : "");
  logger.debug("indexTypeUrl=" + self.indexTypeUrl);

  self.submitFile = function submitFile(f, cb, noRetry) {
    fs.readFile(f, {encoding: 'utf8'}, function (err, txt) {
      if (err) {
        logger.error("Could not read file: %s\n", f, err);
        return cb ? setImmediate(cb, err) : null;
      }
      try {
        var json = JSON.parse(txt);

        if (Array.isArray(json)) {
          logger.debug("Seeing array in file:" + f + ", length:" + f.length);
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
        } else {
          logger.debug("submitting object of type:" + typeof(json));
          self.submitObject(json, f, cb);
        }
      } catch (e) {
        logger.error("Processing json from %s for submission.", f, e);
        if (noRetry) return cb ? setImmediate(cb, e) : null;
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
    logger.debug("Putting:" + self.indexTypeUrl + id);
    var putErrorHandled;
    request.put(self.indexTypeUrl + id)
      .send(json)
      .on('error', function (err) {
        putErrorHandled = true;
        handleHttpError(err, util.format("putting file %s to %s", f, self.indexTypeUrl), cb);
      })
      .end(function (err, res) {
        if (err) return putErrorHandled ? (cb? setImmediate(cb,err):null)
          : handleHttpError(err, "creating index: " + self.indexTypeUrl, cb);
        if (!res.ok) {
          logger.error("%s, %s, while posting from file: %s, to URL: %s, object: %s", res.status,
            res.text || res.body, f, self.indexTypeUrl + id, util.inspect(json));
          if (cb) setImmediate(cb,
            util.format("Error posting to %s: %s: %s", self.indexTypeUrl + id, res.status,
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
      var putErrorHandled;
      request.get(self.indexTypeUrl + '_count')
        .on('error', function (err) {
          putErrorHandled = true;
          handleHttpError(err, "Getting document count", cb);
        })
        .end(function (err, res) {
          if (err) return putErrorHandled ? null : handleHttpError(err,
            "creating index: " + self.indexTypeUrl, cb);
          if (!res.ok) {
            logger.error('bad result from count: %s; %s', res.status, res.text || res.body);
            if (cb) setImmediate(cb, res.status + ':' + res.text || res.body);
            return;
          } // else
          if (cb) setImmediate(cb, null, res.body);
        });
    }, 1000);
  };

  function handleHttpError(err, where, cb) {
    var msg = util.format(where + ' : ');
    logger.error(msg, err);
    return cb ? setImmediate(cb, msg) : null;
  }

  self.getConfig = function () {
    return config;
  };

  self.deleteIndex = function deleteIndex(mapurl, cb) {
    if (!cb && typeof mapurl === 'function') {
      cb = mapurl;
      mapurl = null;
    }
    mapurl = mapurl || self.indexTypeUrl + '_mapping';
    var putErrorHandled;
    request.del(mapurl)
      .on('error',
        function (err) {
          putErrorHandled = true;
          return handleHttpError(err, "NOTE: you cannot delete an index TYPE in Elastic 2.x.x. While deleting index"
            + " type: " + mapurl, cb);
        })
      .end(function (err, res) {
        if (err) {
          // ok if missing
          if (res && res.statusCode == '404') return cb ? setImmediate(cb) : null;
          return putErrorHandled ? null : handleHttpError(err, "deleting index: " + mapurl, cb);
        }
        if (!res.ok) {
          logger.warn("Not able to delete objects under mapping type:%s; status: %s", mapurl,
            res ? res.statusCode : "NO response from ES on deletion");
        }
        cb ? setImmediate(cb) : logger.warn("no callback given to ElasticIndexer#deleteIndex");
      });
  };

  // Specify indexToDelete to let us know you want to delete the whole index
  // Elastic 2.x.x does not allow deleting index type. Rather than cause chaos
  // we will let the error happen if you try to delete an index type.
  // **Recommend that you delete-by-query if necessary and put mapping befor starting this
  // indexing program.
  self.putMapping = function putMapping(indexToDelete, cb) {
    var mapurl = self.indexTypeUrl + '_mapping';
    if (! cb && typeof indexToDelete == 'functino'){
      cb=indexToDelete;
      indexToDelete = self.indexTypeUrl;
    }
    var putErrorHandled;
    if (config.index.mapping) {
      var map;
      if (typeof config.index.mapping == 'string') {
        fs.readFile(config.index.mapping, function (err, txt) {
          if (err) {
            logger.error("Could not read mapping file: %s. Attempting to continue.",
              config.index.mapping, err);
            return cb ? setImmediate(cb, err) : err;
          }
          map = JSON.parse(txt);
          doMapping();
        })
      } else {
        map = config.index.mapping;
        doMapping();
      }
      function doMapping() {
        var putErrorHandled;
        var mtype = config.index.type;
        if (map && !Object.keys(map).contains(mtype)) {
          // This is fatal. catch it early.
          throw new Error(util.format("index type declared in config as %s, but that type is not found in mapping: %j",
            mtype, map));
        }

        function putMap() {
          var putErrorHandled;
          request.put(mapurl)
            .send(map)
            .on('error', function (err) {
              putErrorHandled = true;
              handleHttpError(err, "putting map to: " + mapurl, cb);
            })
            .end(function (err, res) {
              if (err) return putErrorHandled ? null : handleHttpError(err, "creating index: " + mapurl,
                cb);
              if (!res.ok) {
                logger.error("posting mapping to mapurl: %s, %s: %s: %s", mapurl,
                  config.index.mapping, res.status,
                  res.text || res.body);
                return cb ? setImmediate(cb, res.status + ':' + res.text || res.body) : null;
              }
              if (cb) setImmediate(cb);
            });
        }


        request.get(mapurl)
          .on('error', function (err) {
            putErrorHandled = true;
            handleHttpError(err, "getting map from: " + mapurl, cb);
          })
          .end(function (err, res) {
            if (err) {
              if (!res || res.statusCode != '404')
                return putErrorHandled ? null : handleHttpError(err, "creating index: " + mapurl, cb);
            }
            if (res.ok) {
              if (res.body && Object.keys(res.body).length > 0) {
                if (config.index.clean) {
                  logger.warn("Replacing existing mapping with new or default mapping."
                    + " Saving existing mapping to mapping.bak");
                  fs.writeFileSync(config.index.name + '-mapping.json.bak', res.body);
                  // cannot delete an index TYPE in elastic 2.x.x
                  request.del(indexToDelete)
                    .on('error',
                      function (err) {
                        putErrorHandled = true;
                        return handleHttpError(err, "NOTE: you cannot delete an index TYPE in Elastic 2.x.x."
                          + " While deleting index: " + mapurl, cb);
                      })
                    .end(function (err, res) {
                      if (res && res.statusCode == '404') return cb ? setImmediate(cb) : null;
                      if (err) return putErrorHandled ? null : handleHttpError(err,
                        "creating index: "
                        + mapurl, cb);
                      if (!res.ok) {
                        logger.warn("Not able to delete objects under mapping type:%s", mtype);
                      }
                      putMap();
                    });
                }
                if (cb) setImmediate(cb);
              } else { // index exists but mapping is empty
                putMap();
              }
            } else { // else new index/mapping
              logger.info("Creating new index <%s> with settings: %j",
                mapurl, config.index.settings);
              var putErrorHandled;
              request.put(config.index.url)
                .send({settings: config.index.settings, mappings: map})
                .on('error', function (err) {
                  putErrorHandled = true;
                  return handleHttpError(err, "creating index: " + config.index.url, cb);
                })
                .end(function (err, res) {
                  if (err) return putErrorHandled ? null : handleHttpError(err,
                    "creating index: " + config.index.url, cb);
                  if (!res.ok) {
                    var msg = util.format("creating new index at createUrl: %s, %s: %s: %s",
                      config.index.url,
                      config.index.mapping, res.status,
                      res.text || res.body);
                    logger.error(msg);
                    return cb ? setImmediate(cb, msg) : null;
                  }
                  if (cb) setImmediate(cb);
                });
            }
          });
      }
    } else { // no mapping file
      request.put(config.index.url)
        .send({settings: config.index.settings})
        .on("error", function (err) {
          putErrorHandled = true;
          handleHttpError(err, "creating: " + mapurl, cb);
        })
        .end(function (err, res) {
          if (err) return putErrorHandled ? null : handleHttpError(err, "creating index: "
            + config.index.url, cb);
          if (!res.ok) {
            logger.error("creating index: %s, %s: %s", config.index.url,
              res.status, res.text || res.body);
            return cb ? setImmediate(cb, res.status + ':' + res.text || res.body) : null;
          }
          if (cb) setImmediate(cb);
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
        } else {
          accum.push(value);
          return accum;
        }
      },
      []);
    var sawErrors = 0;
    logger.debug("Files: " + util.inspect(files));
    function doOne() {
      if (!files || !files.length) {
        return cb ? setImmediate(cb) : null;
      }
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
}
;

function deepExtend(target, src) {
  util._extend(target, src);
  Object.keys(src).forEach(function (key) {
    if (typeof src[key] === 'object') deepExtend(target[key], src[key]);
  });
  return target;
}

exports.resolveConfigOptions = function (config, clean, level) {
  config.index.clean = config.index.clean || clean;

  config.logger = config.logger || logger;
  config.index.server = config.index.server || "localhost";
  config.index.port = config.index.port || 9200;

  // config.query.url is
  config.index.url = config.index.url ||
    util.format('http://%s:%d/%s', config.index.server, config.index.port, config.index.name);
  if (level) logger.setLevel(level);
  logger.debug("CONFIG: " + util.inspect(config));
  exports.initIndexer(config);
}

exports.initIndexer = function (config) {
  config.indexer = new exports.ElasticIndexer(config);
}

exports.resolveClOptions = function resolveClOptions(argv, overrides) {
  var config;
  var pfile = argv.config;

  if (typeof pfile === 'object' && pfile.index) {
    config = deepExtend({}, pfile);
  } else {
    if (!/\.js$/.test(pfile)) pfile += '.js';
    // be careful because require caches the object and you can't safely reuse it.
    config = deepExtend({}, require(path.resolve(process.cwd(), pfile)));
  }
  if (overrides) {
    // note: only good for one-level overrides:
    // config.output = {foo, bar} and overrides.output={baz} => config.output = {foo, baz, bar}
    // but config.output = {foo:{x,y}, bar} and overrides.output={foo:{z}} => config.output = {foo:{z}, baz, bar}
    Object.keys(overrides).forEach(function (x) {
      if (config[x]) deepExtend(config[x], overrides[x]);
      else config[x] = overrides[x];
    });
  }

  exports.resolveConfigOptions(config, argv.clean, argv.level);
  return config;
};
