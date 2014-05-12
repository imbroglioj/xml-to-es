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
    ha = require('./lib/handleAnomalies.js')
    ;


if (!Array.prototype.contains) {
    Object.defineProperty(Array.prototype, 'contains', {value: function (item) {return this.indexOf(item) >= 0;}});
}

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

exports.Parser = function (config) {
    var self = this;
    var vacuousKeys = config.flatten;

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
        } catch (err) {
            console.error(util.format("ERROR: %s\n--whileflattening: %s\n%s"), err, util.inspect(data, {depth: 2}),
                (err.stack ? err.stack : ''));
        }
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
            self.xmlToJson(s,cb);
        } catch (err) {
            logger.error("Processing string: %s\n", s, err);
            return cb ? setImmediate(cb) : null;
        }
    }

    function modifyJson(result, cb) {
        lowerCaseKeys(result);
        try {
            // promotions
            Object.keys(result).forEach(function (parent) {
                // promote[key] : [..]
                if (config.promote[parent]) {
                    // travel array
                    config.promote[parent].forEach(function (pkey) {
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
                }
            });
            // parser messes up "arrays" by turning strings into meaningless objects
            result = flattenBogusObjects(result);
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
    // * generator (json_version_of_xml) : outputs json to file in whatever format desired
    self.processXmlDocs = function processXmlDocs(xml, generator) {
        logger.trace("going to parse now");
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

        function oneDoc() {
            var teRegex = new RegExp('<' + topElement, 'igm');
            if (!strings || !strings.length) return;
            var s = strings.shift().trim();

            if (s && teRegex.test(s)) {
                doneOne = true;
                processPossibleGoodDoc(teRegex, s, strings, eltClose, function (err, result) {
                    if (err) {
                        if (err === 'recycling') return setImmediate(oneDoc);
                        logger.error("Field handling error processing string: %s\n", s, err);
                        return setImmediate(oneDoc);
                    } // else
                    generator.generator(result);
                    setImmediate(oneDoc);
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
            } else
                modifyJson(x, cb);
        });
    };

};

exports.Generator = require('./generator.js').Generator;

exports.logger = require('./cheap-logger.js').logger;

var missingID = 0;
var topElement;
var doctypeRegex = /<\!DOCTYPE[^>]*>/i;

