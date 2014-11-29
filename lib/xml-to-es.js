// # owl-libxmljs-test.js
/**
 * (c) 1999-2012 Chiliad Publishing Inc.  All Rights Reserved.
 * This document and its contents represent Chiliad proprietary information. Access to this information is restricted to parties that have executed license agreements or non-disclosure agreements directly with Chiliad.
 *
 * author: jbroglio
 * Date: 10/6/13
 * Time: 10:30 AM
 */

require('string_score');

var //mongo = require('mongoskin'),
    util = require('util'),
    parser = require('libxml-to-js'),
    path = require('path'),
    fs = require('fs'),
    ha = require('./handleAnomalies.js'),
    Generation = require('./Generation.js').Generation
    ;


if (!Array.prototype.contains) {
    Object.defineProperty(Array.prototype, 'contains', {value: function (item) {return this.indexOf(item) >= 0;}});
}

function isEmptyObject(x) {
    return !Array.isArray(x) && typeof x == 'object' && !Object.keys(x).length;
}

exports.Parser = function (config) {
    var self = this;
    var preProcess = config.input.preProcess,
        vacuousKeys = config.input.flatten,
        delFields = config.input['delete'],
        renames = config.input['rename'],
        logger = config.logger;

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

    function recurseJson(data, objectHandler){
        try {
            if (typeof data !== 'object') return data;
            if (Array.isArray(data)) {
                return data.map(function (elt) {
                    return recurseJson(elt, objectHandler);
                });
            }
            if (typeof data != 'object' || Object.keys(data).length === 0) return data;
            // Else must be object
            return objectHandler.call(this, data);
        } catch (err) {
            console.error(util.format("ERROR: %s\n--while recursing:%s on %s\n%s"),
                err, JSON.stringify(objectHandler),util.inspect(data, {depth: 2}),
                (err.stack ? err.stack : ''));
        }
    }

    function flattenObjectHandler(data){
        var keys = Object.keys(data);
        if (keys.length == 1 && vacuousKeys.contains(keys[0])) return recurseJson(data[keys[0]], flattenObjectHandler);
        // else
        keys.forEach(function (key) {
            if (data[key]) data[key] = recurseJson(data[key], flattenObjectHandler);
        });
        return data;
    }

    function deleteFieldsObjectHandler(data){
        var keys = Object.keys(data);
        keys.forEach(function (key) {
            if (delFields[key]){
                delFields[key].forEach(function(rm){
                    delete data[key][rm];
                })
                if (! Object.keys(data[key]).length) delete data[key];
            } else data[key] = recurseJson(data[key], deleteFieldsObjectHandler);
            //if (data[key]) data[key] = recurseJson(data[key], flattenObjectHandler);
        });
        return data;
    }

    function renameObjectHandler(data){
        var keys = Object.keys(data);
        keys.forEach(function (key) {
            if (renames[key]){
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
            return cb('recycling');
        }

        s = ha.handleUnclosedQuotes(s);
        // replace junky ampersand chars; todo: Should we replace these with utf8???
        s = s.replace(/&#[0-9]+;/g, '');
        // now add the close element, since we stripped it out previously with xml.split
        s += eltClose;

        try {
            self.xmlToJson(s, cb);
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
                        log.warn("Promoting %s.%s:%s clobbers %s:%s. Clobbering now.",
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
        if (preProcess) result = preProcess(result, config);
        try {
            // promotions
            if (config.input.promote) {
                result = promoteOne(result);
            }
            // parser messes up "arrays" by turning strings into meaningless objects
            if (delFields){
                result=recurseJson(result,deleteFieldsObjectHandler)
            }
            if (vacuousKeys) {
                result=recurseJson(result, flattenObjectHandler)
            }
            if (renames){
                result=recurseJson(result, renameObjectHandler);
            }
            //result = flattenBogusObjects(result);
            // final cleanup of keys that have been emptied
            Object.keys(result).forEach(function (key) {
                if (typeof result[key] === 'object' && !Object.keys(result[key]).length) delete result[key];
            });
            if (!result.id) result.id = 'missingID-' + missingID++;
            cb(null, result);
        } catch (err) {
            console.error(util.format('modifyJson: %s\n  %s\nFROM:%s', err, (err.stack ? err.stack : ''),
                util.inspect(result, {depth: 2})));
            if (cb) cb(err);
        }
    }

    // # procesXmlDocs
    // Handles a string which may contain one or more xml/sgml documents.
    // * xml : the string with xml document(s)
    // * infilePath: file being processed, could be URI, DB ref, etc.
    // * generator (json_version_of_xml) : outputs json to file in whatever format desired
    self.processXmlDocs = function processXmlDocs(xml, generator, cb) {
        logger.trace("going to parse now");
        var runon = /^\s*(<\?xml[^>]*>)\s*</i.exec(xml);
        if (runon && runon.length > 1) xml = xml.replace(runon[1], ''); //runon[1]+'\n');
        var doctype = xml.match(doctypeRegex);
        xml = xml.replace(doctypeRegex, '').trim();
        var tmp = /^[\n]*<([A-Z]\S+)/i.exec(xml);
        if (!tmp) {
            throw new Error("malformed xml: no topElement: " + xml.substring(0, 50));
        }
        topElement = tmp[1]; // group
        var eltClose = '</' + topElement + '>';
        var strings = xml.split(eltClose);
        var doneOne = false;

        function oneDoc(err, data) {
            var teRegex = new RegExp('<' + topElement, 'igm');
            if (!strings || !strings.length) return cb ? setImmediate(cb,err,data) : '';
            var s = strings.shift().trim();
            if (! s.length) return setImmediate(oneDoc, err, data);
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
        parser(s, function (err, x) {
            if (err) {
                logger.error("Parse error processing string: %s\n", s, err);
                return cb(err);
            } else {
                modifyJson(x, cb);
            }
        });
    };

    self.processFiles = function (cb) {
        var files = config.infiles.slice(0);

        function doOne() {
            if (!files || !files.length) {
               return config.generator(':done', cb);
            }
            var infile = files.shift(); // do in order
            var input = fs.createReadStream(infile, 'utf8'); // should this be bin?
            var xml = '';
            logger.debug("Starting main");
            input.on('data', function (chunk) {
                logger.trace("Digested chunk");
                xml += chunk;
            });
            config.input.currentFile=infile;  // could also be URI, DBref, etc.
            input.on('end', function () {
                self.processXmlDocs(xml, config.generator, doOne);
            });
        }

        doOne();
    };

};

// only safe when adding new keys; not for merging!
function deepExtend(target, src) {
    util._extend(target, src);
    Object.keys(src).forEach(function (key) {
        if (typeof src[key] === 'object') deepExtend(target[key], src[key]);
    });
    return target;
}

exports.logger = require('./cheap-logger.js').logger;

exports.resolveOptions = function (argv, overrides) {
    var pfile = argv.config;
    if (!/\.js$/.test(pfile)) pfile += '.js';
    // be careful because require caches the object and you can't safely reuse it.
    var config = deepExtend({}, require(path.resolve(process.cwd(), pfile)));
    exports.logger.setLevel(argv.level || 'DEBUG'); // don't mess with config.logger
    config.logger = config.logger || exports.logger;
    var logger = config.logger;
    //console.dir(config);
    if (config.output.fmt) config.output.fmt = config.output.fmt.toLowerCase();
    var infiles=[];
    for (var i = 0; i< argv._.length; i++){
        var tmp = argv._[i].split(',');
        infiles=infiles.concat(tmp);
    }
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
    function drill(infile){
        //console.log("Infile: "+infile);
        if (!fs.existsSync(infile)) {
            throw new Error("No such input file or directory: " + infiles);
        }
        if (fs.statSync(infile).isDirectory()) {
            fs.readdirSync(infile).forEach(function(f){
                drill(path.join(infile,f));
            });
        } else {
            if (!config.input.fileExt || path.extname(infile) == config.input.fileExt)
                config.infiles.push(infile);
        }
    }

    if (!config.infiles) {
        config.infiles = [];
        //console.log("infiles incoming:" + util.inspect(infiles));
        infiles.forEach(function (infile) {
            drill(infile);
        });
        logger.debug("%d config infiles: ", config.infiles.length);
    }

    if (config.output.fileExt && !/^\./.test(config.output.fileExt)) {
        config.output.fileExt = '.' + config.output.fileExt;
    }
    if (config.output.destDir) {
        config.output.destDir = path.resolve(process.cwd(), config.output.destDir);
        if (!fs.existsSync(config.output.destDir)) fs.mkdirSync(config.output.destDir);
    }
    if (!config.input.flatten) config.input.flatten = [];
    if (!config.input.flatten.contains('#')) config.input.flatten.unshift('#');

    var generator = new Generation(config);
    generator.instantiateGenerator(config);
    return config;
};


var missingID = 0;
var topElement;
var doctypeRegex = /<\!DOCTYPE[^>]*>/i;

