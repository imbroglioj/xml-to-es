/** fileSpec
 *
 * author: jbroglio
 * Date: 5/10/14
 * Time: 6:00 PM
 */

var should = require('chai').should()
    , fs = require('fs')
    , path = require('path')
    , core = require('../src/xml-to-es')
    ;

describe("sgml tests", function () {
    var config = core.resolveOptions({
        _: [path.join(__dirname, 'data', 'test.sgm')],
        config: path.join(__dirname, '../examples/json-config.js'),
        level: 'error',
        '$0': process.argv[0] + ' ' + process.argv[1]
    });
    var config2 = core.resolveOptions({
        _: [path.join(__dirname, 'data', 'goodTagsTest.sgm')],
        config: path.join(__dirname, '../examples/json-config.js'),
        level: 'error',
        '$0': process.argv[0] + ' ' + process.argv[1]
    });
    var config3 = core.resolveOptions({
        _: [path.join(__dirname, 'data', 'badTagsTest.sgm')],
        config: path.join(__dirname, '../examples/json-config.js'),
        level: 'error',
        '$0': process.argv[0] + ' ' + process.argv[1]
    });

    var config4 = core.resolveOptions({
        _: [path.join(__dirname, 'data')],
        config: path.join(__dirname, '../examples/json-config.js'),
        level: 'error',
        '$0': process.argv[0] + ' ' + process.argv[1]
    });

    it('should handle one doc', function () {
        config.generator = function (json) {
            console.log("Using TEST generator");
            should.exist(json);
            should.exist(json.id);
            json.id.should.eql("10003");
            json.body.should.contain("Biogen");
            json.title.should.contain('BIOGEN');
        };
        new core.Parser(config).processFiles();
    });

    it('should handle six docs', function(){
        var docs=[];
        config2.generator = function (json) {
            docs.push(json);
        };
        new core.Parser(config2).processFiles(function(){
            docs.length.should.equal(6);
            docs.forEach(function(json){
                should.exist(json);
                should.exist(json.id);
                json.id.should.match(/^[0-9]+/);
            });
        });
    });

    it('should handle 6 docs with bad sgml', function(){
        var docs=[];
        config3.generator = function (json) {
            docs.push(json);
        };
        new core.Parser(config3).processFiles(function(){
            docs.length.should.equal(6);
            docs.forEach(function(json){
                should.exist(json);
                should.exist(json.id);
                json.id.should.match(/^(missingID|[0-9]+)/);
                if (/Missing/.test(json.id)) console.log(json.id);
            });
        });
    });

    it('should handle test directory with 3 files', function(){
        var docCount = 0;
        config4.infiles.length.should.equal(3);
        config4.generator = function (json) {
            docCount++;
        };
        new core.Parser(config4).processFiles(function(){
            docCount.should.equal(13);
        });

    })
});
