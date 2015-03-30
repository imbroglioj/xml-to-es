// # owl-libxmljs-test.js
 * author: jbroglio
 * Date: 3/29/15
 * Time: 10:30 AM
 */

//require('string_score');

var //mongo = require('mongoskin'),
    util = require('util'),
    cheerio = require('cheerio')
    ;



if (!Array.prototype.contains) {
    Object.defineProperty(Array.prototype, 'contains', {value: function (item) {return this.indexOf(item) >= 0;}});
}


exports.Parser = function (config) {
    var self = this;

    // ## htmlToJson
    // Handles one html document (as string)
    self.htmlToJson = function (s, cb) {
        var tag,text, json={};
        var $ = cheerio.load(s);
        // error check here:         return cb(err);
        $("META").each(function(i, elem){
            j[elem.attribs.name] = elem.attribs.content;
        });
        if (j.patiend.id){
            j.body = $("body").text();
        }
        cb(null, j);
    };
};
