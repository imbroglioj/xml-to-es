// # owl-libxmljs-test.js
/**
 * (c) 1999-2012 Chiliad Publishing Inc.  All Rights Reserved.
 * This document and its contents represent Chiliad proprietary information. Access to this information is restricted to parties that have executed license agreements or non-disclosure agreements directly with Chiliad.
 *
 * author: jbroglio
 * Date: 10/6/13
 * Time: 10:30 AM
 */


var //mongo = require('mongoskin'),
    util = require('util'),
    fs = require('fs'),
    path=require('path'),
    cheap = require('./cheap-logger.js'),
    logger = cheap.logger,
    collectErrors = cheap.collectErrors,
    parser = require('libxml-to-js'),
    generator=require('./generator.js'),
    htmlGenerator = new generator.HtmlGenerator(fs, util,logger),
    jsonGenerator = new generator.JsonGenerator(fs, util,logger);
    argv = require('optimist')
        .usage('USAGE: $0 INPUT_FILE --properties PATH_TO_PROPERTIES_JS [--level LOGLEVEL]')
        .demand([1, 'properties'])
        .string('properties')
        .argv
    ;

function apush(json, key, val) {
    if (json[key]) {
        json[key].push(val);
    }
    else {
        json[key] = [val];
    }
}

function apushSet(json, key, val) {
    if (json[key] && json[key].indexOf(val) >= 0) {
        return false;
    }
    else {
        apush(json, key, val);
        return true;
    }
}

function handleArray(cl, owlKey, json, key) {
    var owl = cl[owlKey];
    if (owl && owl.length) {

        owl.forEach(function (x) {apush(json, key, x['#'])});
    }
}

if (!Array.prototype['contains']){
    Object.defineProperty(Array.prototype,'contains', {value: function(item){return this.indexOf(item)>=0}});
}

process.on('uncaughtException', function (err) {
    logger.error(util.inspect(err, {depth: null}));
})

function lowerCaseKeys(o) {
    Object.keys(o).forEach(function (key) {
        var kl = key.toLowerCase();
        var val = o[key];
        o[kl] = val;
        if (kl !== key) delete o[key];
        if (!Array.isArray(val) && val instanceof Object) {
            if (!Object.keys(val).length) {
                delete o[kl];
            }
            else {
                lowerCaseKeys(val);
            }
        }
    });
}

function flattenBogusObjects(data) {
    try {
        if (typeof data !== 'object') return data;
        if (Array.isArray(data)) return data.map(function (elt) {
            return flattenBogusObjects(elt);
        });
        if (typeof data != 'object' || Object.keys(data).length === 0) return data;
        // Else must be object
        var keys = Object.keys(data);
        if (keys.length == 1 && vacuousKeys.contains(keys[0])) return flattenBogusObjects(data[keys[0]]);
        // else
        keys.forEach(function (key) {
            if (data[key]) data[key] = flattenBogusObjects(data[key]);
        });
        return data;
    } catch (err){
        console.error(util.format("ERROR: %s\n--whileflattening: %s\n%s"),err,util.inspect(data,{depth:2}),
            (err.stack? err.stack:''));
    }
}

function handleFields(error, result) {
    var onto;
    var classes;
    var axioms

    if (error) return logger.error("Parsing xml from file", error);
    lowerCaseKeys(result);
    try {
        // promotions
        Object.keys(result).forEach(function(key){
            // promote[key] : [..]
            if (promote[key]){
                // travel array
                promote[key].forEach(function(pkey){
                    var target = pkey;
                    if (typeof pkey === 'object'){
                        target = pkey.target;
                        pkey=pkey.key;
                    }
                    if (result[target]){
                        log.warn("Promoting %s.%s:%s clobbers %s:%s. Clobbering now.",
                            key,pkey,result[key][pkey],
                            target, result[target]);
                    }
                    result[target] = result[key][pkey];
                    delete result[key][pkey];
                });
            }
        });
        // parser messes up "arrays" by turning strings into meaningless objects
        result = flattenBogusObjects(result);
        // final cleanup of keys that have been emptied
        Object.keys(result).forEach(function(key){
            if (typeof result[key] === 'object' && !Object.keys(result[key]).length) delete result[key];
        });
            var output=fs.createWriteStream(path.join(destDir, result.id+'-'+path.basename(argv._[0])
                .replace(path.extname(argv._[0]),fileExt)), {encoding: 'utf8'});
            if (argv.aggr){
                htmlGenerator.generate(output, result, bodyKey);
            }
            jsonGenerator.generate(output, result, bodyKey);

    } catch (err) {
        console.error(util.format('handleFields: %s\n  %j\nFROM:%s', err, (err.stack? err.stack:''),
            util.inspect(result, {depth: 2})));
    }

};

var vacuousKeys=[];

var qreg = /["]/g;
var paraq = /\n[ ]{4}"(\S+(\s|\n))*[ ]{4}/g;
var badq = /"(\S+(\s\n))*"/g;
var topElement;
var doctypeRegex=/\<\!DOCTYPE[^>]*>/i;
var destDir = './json';
var fileExt = '.json';
var bodyKey = 'text';
var properties;
var promote;
if (require.main === module) {
    var pfile = argv.properties;
    if (!/\.js$/.test(pfile)) pfile+='.js';
    properties=require(path.resolve(pfile));
    fileExt=properties.targetFileExt;
    if (fileExt && !/^\./.test(fileExt)) fileExt = '.'+fileExt;
    destDir = properties.destDir;
    destDir = path.resolve(destDir);
    if (!fs.existsSync(destDir)) fs.mkdir(destDir);
    vacuousKeys = properties.flatten;
    if (! vacuousKeys.contains('#')) vacuousKeys.unshift('#');
    bodyKey = properties.bodyKey;
    promote=properties.promote;
    logger.setLevel(argv.level || 'DEBUG');
    logger.debug("Starting main");
    var input = fs.createReadStream(argv._[0], 'utf8'); // should this be bin?
    var xml = '';
    input.on('data', function (chunk) {
        logger.trace("Digested chunk");
        xml += chunk;
    });
    input.on('end', function () {
        logger.trace("going to parse now");
        var doctype = xml.match(doctypeRegex);
        xml = xml.replace(doctypeRegex, '');
        var tmp= /^<([A-Z]\S+)/i.exec(xml);
        if (!tmp){
            throw new Error("malformed xml: no topElement: "+xml.substring(0,50));
        }
        topElement = tmp[1]; // group
        var teRegex = new RegExp('^<'+topElement);
        var eltClose= '</'+topElement+'>';
        var strings = xml.split(eltClose)
        var doneOne=false;
        strings.forEach(function (s) {
            if (teRegex.test(s)) {
                doneOne=true;
                // handle unclosed quotes
                var quotes = s.match(qreg);
                var paras, index = 0;
                if (quotes && quotes.length % 2 == 1) { //missing close quote
                    do {
                        paras = paraq.exec(s.substring(index));
                        if (paras) {
                            index = paras.index;
                            if (paras[0].match(qreg).length % 2 == 1) {
                                // don't try to get it right, just balance the damn things.
                                s = s.replace(paras[0], paras[0] + '"');
                            }
                        }
                    } while (paras);
                }
                s = s.replace(/&#[0-9]+;/g, '');
                s += eltClose;
                try {
                    parser(s, function(err, x){handleFields(err, x);});
                } catch (err) {
                    console.error(err + '\n' + s);
                }
            } else {
                // what about comments?
                if (s.trim().length)
                    console.error(util.format('Top element: %s not found in start of xml piece: %s'),
                        topElement, s.substring(0,100));
            }
        });
     });
}