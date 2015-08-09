/** handleAnomalies
 * handle odd problems with the input
 * author: jbroglio
 * Date: 5/7/14
 * Time: 8:30 PM
 */

// adds similarity comparison to string object
// "foo".score("f") > 0.5
require('string_score');

var util = require('util');
var paraq = /\n[ ]{4}"(\S+(\s|\n))*[ ]{4}/g
    , qreg = /["]/g
    , badq = /"(\S+(\s\n))*"/g
    , logger = require('./cheap-logger.js').logger
    ;

exports.handleUnclosedQuotes = function handleUnclosedQuotes(s) {
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
    return s;
};

function clearElementClose(ns, topElement) {
    var tail = ns.lastIndexOf('</');
    if (tail) {
        var check = ns.substring(tail);
        var lt = check.match(/<\/(\S+)>/);
        if (lt && topElement.score(lt[1]) > 0.5) {
            // so erase the bogus end element since we will add it automagically later
            ns = ns.substring(0, tail) + ns.substring(tail).replace(lt[0], '');
        }
    } // else leave alone, we'll add it later
    return ns;
}
exports.splitForBadDocumentClose = function splitForBadDocumentClose(s, topElement, teRegex, strings) {
    var currentIndex = 0;
    // split docs with missing or bad head element close
    var newStrings = [];
    var tmp;
    while ((tmp = teRegex.exec(s))) {
        // missing end element
        var ns = s.substring(currentIndex, tmp.index);
        ns = clearElementClose(ns, topElement);
        newStrings.push(ns);
        currentIndex = tmp.index;
    }
    if (newStrings.length && s.length > currentIndex) newStrings.push(s.substring(currentIndex));
    return newStrings;
};

//todo: can we safely capture a situation where the <HEAD is missing but the attributes..> are intact?
exports.supplyMissingHeadElement = function supplyMissingHeadElement(s, topElement, strings, cb) {
    if (s.length) {
        logger.warn(util.format('Top element: %s not found in start of xml piece: %s.'),
            topElement, s.substring(0, 100));
        if (s.length > 20) {
            var loc = /<([^-\s!>]+)/.exec(s);
            if (topElement.score(loc[1]) > 0.5) {
                s = s.replace(loc[1], topElement);
                logger.warn('*** correcting top element to: %s\n', s.substring(0, 100));
            } else {// okay just fudg it
                s = '<' + topElement + '>\n' + s;
                logger.warn('*** adding top element as: %s\n', s.substring(0, 100));
            }
            strings.unshift(s);
        }
    }
    if (cb) setImmediate(cb);
};
