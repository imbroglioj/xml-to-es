// # xml-to-es.js
/**
 * author: jbroglio
 * Date: 10/6/13
 * Time: 10:30 AM
 */

var //mongo = require('mongoskin'),
  util = require('util'),
  xml2js = require('xml2js'),
  parser = new xml2js.Parser({explicitArray: false, attrkey: "@", charkey: "#"}),
  path = require('path'),
  fs = require('fs'),
  ha = require('./handleAnomalies.js'),
  Generation = require('./Generation.js').Generation
;

if (!String.prototype.format) {
  String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
        ;
    });
  };
}


var missingID = 0;
var topElement;
var doctypeRegex = /<\!DOCTYPE[^>]*>/i;

if (!Array.prototype.contains) {
  Object.defineProperty(Array.prototype, 'contains', {value: function (item) {return this.indexOf(item) >= 0;}});
}

function isEmptyObject(x) {
  return !Array.isArray(x) && typeof x == 'object' && !Object.keys(x).length;
}

exports.Parser = function (config) {
  var self = this;
  var preProcess,
    vacuousKeys,
    delFields,
    renames,
    logger;

  if (config.input) {
    preProcess = config.input.preProcess;
    vacuousKeys = config.input.flatten;
    delFields = config.input.delete;
    renames = config.input.rename;
    logger = config.logger;
  }
  function lowerCaseKeys(o) {
    if (Array.isArray(o)) return o.forEach(function (elt) { lowerCaseKeys(elt)});
    // else
    if (typeof o != 'object') return; // leave values alone
    // else
    Object.keys(o).forEach(function (key) {
      var kl = key.toLowerCase();
      var val = o[key];
      o[kl] = val;
      if (kl !== key) delete o[key];
      if (isEmptyObject(val)) {
        delete o[kl];
      } else if (val instanceof Object) {
        lowerCaseKeys(val);
      }
    });
  }

  function recurseJson(data, objectHandler) {
    try {
      if (typeof data !== 'object') return data;
      if (Array.isArray(data)) {
        return data.map(function (elt) {
          return recurseJson(elt, objectHandler);
        });
      }
      if (!data || typeof data != 'object' || Object.keys(data).length === 0) return data;
      // Else must be object
      return objectHandler.call(this, data);
    } catch (err) {
      console.error(util.format("ERROR: %s\n--while recursing:%s on %s\n%s"),
        err, JSON.stringify(objectHandler), util.inspect(data, {depth: 2}),
        (err.stack ? err.stack : ''));
    }
  }

  function flattenObjectHandler(data) {
    var keys = Object.keys(data);
    if (keys.length == 1 && vacuousKeys.contains(keys[0])) return recurseJson(data[keys[0]], flattenObjectHandler);
    // else
    keys.forEach(function (key) {
      if (data[key]) data[key] = recurseJson(data[key], flattenObjectHandler);
    });
    return data;
  }

  function deleteFieldsObjectHandler(data) {
    // delete top-level
    if (delFields['.']) {
      delFields['.'].forEach(function (rm) {
        delete data[rm];
      })
    }
    var keys = Object.keys(data);
    keys.forEach(function (key) {
      if (delFields[key]) {
        delFields[key].forEach(function (rm) {
          delete data[key][rm];
        });
        if (!Object.keys(data[key]).length) delete data[key];
      } else data[key] = recurseJson(data[key], deleteFieldsObjectHandler);
      //if (data[key]) data[key] = recurseJson(data[key], flattenObjectHandler);
    });
    return data;
  }

  function renameObjectHandler(data) {
    var keys = Object.keys(data);
    keys.forEach(function (key) {
      if (renames[key]) {
        data[renames[key]] = data[key];
        delete data[key];
      } else data[key] = recurseJson(data[key], renameObjectHandler);
    });
    return data;
  }

  function processPossibleGoodDoc(teRegex, s, strings, eltClose, cb) {
    teRegex.lastIndex = 0;
    var ix = teRegex.exec(s).index;
    if (ix > 0) {
      logger.warn("Discarding garbage from before start of doc: %s", s.substring(0, ix));
      s = s.substring(ix);
      // now reset the regex starting point
      teRegex.lastIndex = 0;
      teRegex.test(s);
    }


    var newStrings = ha.splitForBadDocumentClose(s, topElement, teRegex, strings);
    if (newStrings && newStrings.length) {
      // put docs in in correct order
      for (var i = newStrings.length - 1; i >= 0; i--) strings.unshift(newStrings[i]);
      // leave and process prepended strings
      return setImmediate(cb, 'recycling');
    }

    s = ha.handleUnclosedQuotes(s);
    // replace junky ampersand chars; todo: Should we replace these with utf8???
    s = s.replace(/&#[0-9]+;/g, '');
    // now add the close element, since we stripped it out previously with xml.split
    if (!self.isHtml()) s += eltClose;

    try {
      if (self.isHtml()) self.htmlToJson(s, cb);
      else self.xmlToJson(s, cb);
    } catch (err) {
      logger.error("Processing string: %s\n", s, err);
      return cb ? setImmediate(cb) : null;
    }
  }

  function promoteArrayMembers(val) {
    var arr = [];
    val.forEach(function (elt) {
      if (Array.isArray(elt)) {
        arr.unshift(promoteArrayMembers(elt));
      }
      else if (typeof elt === 'object') {
        arr.unshift(promoteOne(elt));
      }
      else {
        arr.unshift(elt);
      }
    })
    return arr;
  }

  function promoteOne(result) {
    Object.keys(result).forEach(function (parent) {
      var val = result[parent];
      //first recurse over subtree
      // we really want continuations here so we don't flood the stack on recursion.
      if (val === undefined) return
      if (Array.isArray(val)) {
        result[parent] = promoteArrayMembers(val);
      } else if (typeof val == 'object') {
        result[parent] = promoteOne(val);
      }
      // promote[key] : [..]
      if (config.input.promote[parent]) {
        // travel array
        config.input.promote[parent].forEach(function (pkey) {
          var target = pkey;
          if (typeof pkey === 'object') {
            target = pkey.target;
            pkey = pkey.key;
          }
          var value = result[parent][pkey];
          if (!value) return;

          if (result[target]) {
            logger.warn("Promoting %s.%s:%s clobbers %s:%s. Clobbering now.",
              parent, pkey, value,
              target, result[target]);
          }
          result[target] = value;
          delete result[parent][pkey];
        });
        if (isEmptyObject(result[parent])) {
          delete result[parent];
        }
      }
    });
    return result;
  }

  function modifyJson(result, cb) {
    lowerCaseKeys(result);
    if (preProcess) preProcess(result, config, postPP);
    else postPP(result);
    function postPP(result) {
      try {
        // promotions
        if (config.input.promote) {
          result = promoteOne(result);
        }
        // parser messes up "arrays" by turning strings into meaningless objects
        if (delFields) {
          result = recurseJson(result, deleteFieldsObjectHandler)
        }
        if (vacuousKeys) {
          result = recurseJson(result, flattenObjectHandler)
        }
        if (renames) {
          result = recurseJson(result, renameObjectHandler);
        }
        //result = flattenBogusObjects(result);
        // final cleanup of keys that have been emptied
        Object.keys(result).forEach(function (key) {
          if (typeof result[key] === 'object' && !Object.keys(result[key]).length) delete result[key];
        });
        if (typeof result.id === 'undefined') result.id = 'missingID-' + missingID++;
        setImmediate(cb, null, result);
      } catch (err) {
        console.error(util.format('modifyJson: %s\n  %s\nFROM:%s', err, (err.stack ? err.stack : ''),
          util.inspect(result, {depth: 2})));
        if (cb) setImmediate(cb, err);
      }
    }
  }

  self.isHtml = function () {
    return config.input.fmt == "html";
  };

  self.htmlToJson = function (s, cb) {
    var cheerio = require('cheerio');
    try {
      var $ = cheerio.load(s);
      var j = {};
      if (!$) {
        logger.error("Cheerio got no json from document:" + s);
        return setImmediate(cb, err);
      }
      $("META").each(function (i, elem) {
        j[elem.attribs.name] = elem.attribs.content;
      });
      j.body = $("body").text();
      modifyJson(j, cb);
    } catch (err) {
      logger.error(err);
      logger.error("was caused by attempting to parse: " + s);
      setImmediate(cb, err);
    }
  };


  var xmlRegexp = /^\s*(<\?xml[^>]*>)\s*</i;
  var htmlRegexp = /^\s*(<html[^>]*>)\s*</i;

  // # processXmlDocs
  // Handles a string which may contain one or more xml/sgml documents.
  // * xml : the string with xml document(s)
  // * infilePath: file being processed, could be URI, DB ref, etc.
  // * generator (json_version_of_xml) : outputs json to file in whatever format desired
  self.processXmlDocs = function processXmlDocs(xml, generator, cb) {
    if (!xml || !xml.trim().length) {
      logger.error("possibly empty xml for doc: %s", config.input.currentFile);
      return cb ? setImmediate(cb) : null;
    }
    logger.trace("going to parse now");
    var runon = self.isHtml() ? htmlRegexp.exec(xml) : xmlRegexp.exec(xml);
    topElement = "html";
    if (!self.isHtml()) {
      if (runon && runon.length > 1) xml = xml.replace(runon[1], ''); //runon[1]+'\n');
      var doctype = xml.match(doctypeRegex);
      xml = xml.replace(doctypeRegex, '').trim();
      var tmp = /^[\n]*<([A-Z]\S+)/i.exec(xml);
      if (!tmp) {
        throw new Error("malformed xml: no topElement: " + xml.substring(0, 50));
      }
      topElement = tmp[1]; // group
    }
    var eltClose = '</' + topElement + '>';
    var strings = xml.split(eltClose);
    var doneOne = false;

    function oneDoc(err, data) {
      var teRegex = new RegExp('<' + topElement, 'igm');
      if (!strings || !strings.length) return cb ? setImmediate(cb, err, data) : '';
      var s = strings.shift().trim();
      if (!s.length) return setImmediate(oneDoc, err, data);
      if (s && teRegex.test(s)) {
        doneOne = true;
        processPossibleGoodDoc(teRegex, s, strings, eltClose, function (err, result) {
          if (err) {
            if (err === 'recycling') return setImmediate(oneDoc);
            logger.error("Field handling error processing string: %s\n", s, err);
            return setImmediate(oneDoc, err, data);
          } // else
          generator(result, oneDoc);
        });
      } else {
        // what about comments?
        s = ha.supplyMissingHeadElement(s, topElement, strings, oneDoc);
      }
    }

    oneDoc();
  };

  // ## xmlToJson
  // Handles one xml document (as string)
  self.xmlToJson = function (s, cb) {
    parser.reset();
    parser.parseString(s, function (err, x) {
      if (err) {
        logger.error("Parse error processing string: %s\n", s, err);
        return setImmediate(cb, err);
      } else {
        modifyJson(x, cb);
      }
    });
  };


  var zlib;
  var AdmZip;

  function unzip(fpath, onReady) {

    if (!AdmZip) {
      AdmZip = require('adm-zip');
    }

    var zipfile = new AdmZip(fpath);
    var entries = zipfile.getEntries();
    if (!entries) {
      logger.error("no entries in zipfile: %s", fpath);
      return onReady(new Error("no entries in zipfile"));
    }
    if (entries.length > 1) {
      logger.error("Cannot currently handle multiple entries in zipfile: %s", fpath);
      return onReady(new Error("too many entries in zipfile"));
    }
    config.currentFile = entries[0].entryName;
    onReady(null, entries[0].getData());
  }

  function gunzip(fpath, onReady) {
    if (!zlib) zlib = require('zlib');

    fs.readFile(fpath, function (err, buf) {
      if (err) {
        logger.error("reading file: %s", fpath, err);
        return onReady(err);
      }
      zlib.gunzip(buf, onReady); // drop stack so buf can be collected
    });
    //var f = fs.createReadStream(fpath); // should this be bin?
    //f.on('data', function (chunk){
    //  buf+=chunk;
    //});
    //f.on('end', function(){
    //
    //});
  }

  var headrx = /^\s*<([^>\s]*)[\s>]/;

  var box = {
    doctype: '',
    dtrx: null,
    enddtrx: null,
    xml: '',
    leftover: ''
  }

  self.processFiles = function (cb) {
    var files = config.infiles.slice(0);
    var input;

    function doOneFile() {
      if (!files || !files.length) {
        return config.generator(':done', cb);
      }
      var infile = files.shift(); // do in order

      config.input.currentFile = infile;  // could also be URI, DBref, etc.

      if (/\.gz$/.test(infile)) {
        gunzip(infile, function (err, data) {
          if (err) {
            // logger.error("could not unzip file: %s", config.input.currentFile);
            throw(err);
          }
          box.xml = data.toString('utf8');
          whenReady();
        });
      } else if (/\.zip/.test(infile)) {
        unzip(infile, function (err, data) {
          if (err) {
            throw(err);
          }
          box.xml = data.toString('utf8');
          whenReady();
        })
      } else {
        input = fs.createReadStream(infile, 'utf8'); // should this be bin?
        input.on('end', function(){
          logger.debug("End of file on file:%s",infile);
          input = null;
          return setImmediate(doOneFile);
        })
        input.on('data', function(chunk){
          box.leftover += chunk;
          checkStart(box);
          input.pause();
          getOneXmlDoc();
        })
      }

      // text files can handle multiple files one by one.
      function getOneXmlDoc() {
        if (box.leftover.length) {
          // should start with doctype
          if (!box.dtrx.test(box.leftover)) {
            logger.error("Saw bad xml element. Expecting: <%s>, saw: %s", box.doctype, box.leftover.substring(0, 40));
            throw new Error("Bad input: text without starting elt. see log");
          }
          var dtClose = box.leftover.match(box.enddtrx);
          if (!dtClose) {
            // go get more data
            return input.resume();
          } // else
          var newDocStart = dtClose.index + dtClose[0].length;
          box.xml = box.leftover.substring(0, newDocStart);
          if (newDocStart < box.leftover.length) {
            // process xml and then leftover
            box.leftover = box.leftover.substring(newDocStart).trim();
          } else {
            // process xml and read more file
            box.leftover='';
          }
          return whenReady(box.leftover.length ? getOneXmlDoc : function(){input.resume()});
        } else {
          return input.resume();
        }
      }

      // at start of file, get doctype
      function checkStart(box) {
        // skip <?xml...>
        if (!box.xml.length) { // start of file

          if (/^<\?xml/.test(box.leftover)) {
            box.leftover.replace(/^<\?xml[^>]*>/, '');
          }
          var txt=box.leftover;
          if (/^<!DOCTYPE/i.test(txt)) txt=txt.replace(/^<!DOCTYPE[^>]*>\s*/,'');
          // get doctype and create regexes
          var m = headrx.exec(txt);
          if (m && m.length) {
            box.doctype = m[1];
            box.dtrx = new RegExp("^(<!DOCTYPE[^>]*>)?\\s*<" + box.doctype + "[\\s>]");
            box.enddtrx = new RegExp("</" + box.doctype + "\\s*>");
          }
        }
      }

      function whenReady(cb) {
        cb = cb || doOneFile;
        //logger.error("infile: %s",config.input.currentFile);
        // logger.info(new Date());
        setImmediate(self.processXmlDocs, box.xml, config.generator, cb);
      }
    }

    doOneFile();
  };
}

// only safe when adding new keys; not for merging!
function deepExtend(target, src) {
  util._extend(target, src);
  if (src) Object.keys(src).forEach(function (key) {
    if (typeof src[key] === 'object') deepExtend(target[key], src[key]);
  });
  return target;
}


exports.logger = require('./cheap-logger.js').logger;

exports.collectFiles = function collectFiles(config, argvFiles) {
  var missingFiles = [];
  var logger = exports.logger;
  if (!argvFiles) return;
  var infiles = [];
  for (var i = 0; i < argvFiles.length; i++) {
    var tmp = argvFiles[i].split(',');
    infiles = infiles.concat(tmp);
  }

  if (!config.infiles) config.infiles = [];
  //console.log("infiles incoming:" + util.inspect(infiles));
  infiles.forEach(function (infile) {
    drill(infile);
  });
  logger.debug("%d config infiles", config.infiles.length);
  if (missingFiles.length) logger.log("The following files or directories were not found: %j", missingFiles);

  function satisfies(sought, filename) {
    if (sought instanceof RegExp) return sought.test(filename);
    if (/[$]$/.test(sought)) return new RegExp(sought).test(filename);
    return new RegExp(sought + "$").test(filename);
  }


  function drill(infile) {
    //console.log("Infile: "+infile);
    if (!fs.existsSync(infile)) {
      missingFiles.push(infile);  // probably a directory
      return;
    }
    if (fs.statSync(infile).isDirectory()) {
      fs.readdirSync(infile).forEach(function (f) {
        drill(path.join(infile, f));
      });
    } else {
      if (!config.input.fileExt || satisfies(config.input.fileExt, infile))
        config.infiles.push(infile);
    }
  }
}

exports.resolveClOptions = function (argv, overrides) {
  var config;
  var pfile = argv.config;
  if (typeof pfile === 'object' && pfile.input && pfile.output) config = pfile;
  else {
    if (!/\.js$/.test(pfile)) pfile += '.js';
    // be careful because require caches the object and you can't safely reuse it.
    config = deepExtend({}, require(path.resolve(process.cwd(), pfile)));
  }
  exports.logger.setLevel(argv.level || 'DEBUG'); // don't mess with config.logger
  config.logger = config.logger || exports.logger;
  var logger = config.logger;
  //console.dir(config);
  if (config.output.fmt) config.output.fmt = config.output.fmt.toLowerCase();
  //console.log("infiles from args:"+util.inspect(infiles));
  if (overrides) {
    Object.keys(overrides).forEach(function (x) {
      if (config[x]) {
        deepExtend(config[x], overrides[x]);
      }
      else {
        config[x] = overrides[x];
      }
    });
  }

  exports.collectFiles(config, argv._);

  if (config.output.fileExt && !/^\./.test(config.output.fileExt)) {
    config.output.fileExt = '.' + config.output.fileExt;
  }
  if (config.output.destDir) {
    config.output.destDir = path.resolve(process.cwd(), config.output.destDir);
    if (!fs.existsSync(config.output.destDir)) fs.mkdirSync(config.output.destDir);
  }
  if (!config.input.flatten) config.input.flatten = [];
  if (!config.input.flatten.contains('#')) config.input.flatten.unshift('#');
  if (config.index) {
    var EI = require('./ElasticIndexer.js');
    EI.resolveConfigOptions(config, argv.clean, argv.level);
    config.indexer = new EI.ElasticIndexer(config);
  }
  var generator = new Generation(config);
  generator.instantiateGenerator(config);
  return config;
};

