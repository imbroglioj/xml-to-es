/** fileSpecPage
 *
 * author: jbroglio
 * Date: 5/13/14
 * Time: 6:26 PM
 */

var htmlFile = 'test.html',
  multiFile = 'multi-doc.html',
  util = require('util'),
  fs = require('fs'),
  path = require('path')
  ;


exports.HtmlInputSpecPage = function (core, path, should) {
  var self = this;

  function jsonDone(json) {return json == ':done';}

  self.jsonDone = jsonDone;
  self.makeJsonConfig = function (filename, overrides) {
    if (typeof overrides === 'string') {
      fileext = overrides;
      overrides = null;
    }
    var args = filename.split(/[,]|\s+/).map(function (f) {
      return path.join(__dirname, 'data', f);
    });
    //console.log(util.format("args: %j",args));
    return core.resolveParseOptions({
      _: args,
      config: path.join(__dirname, '../examples/json-from-html-config.js'),
      level: 'error',
      '$0': process.argv[0] + ' ' + process.argv[1]
    }, overrides);
  };

  // todo: refactor to abstract common code with FileSpecPage
  function testSimpleHtml(file, tests) {
    var config = self.makeJsonConfig(file);
    config.generator = function (json) {
      if (jsonDone(json)) return;
      console.log("Using TEST generator");
      if (tests) tests(json);
      if (config.output.generator) {
        var fpath='json/test.json';
        if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
        var output = fs.createWriteStream('json/test.json', 'utf8');
          config.output.generator.fn(output, json, function () {
            output.close();
          })
        fs.existsSync(fpath).should.equal(true);
      }
    };
    new core.Parser(config).processFiles();
  }

  self.testSimpleHtmlConfig = function () {
    testSimpleHtml(htmlFile, function (json) {
      should.exist(json);
      should.exist(json.id);
      json.id.should.eql("10003");
      json.body.should.contain("Biogen");
      json.title.should.contain('BIOGEN');
    });
  };


  self.testMulti = function () {
    var config = self.makeJsonConfig(multiFile);
    var docs = [];
    config.generator = function (json) {
      if (jsonDone(json)) return;
      docs.push(json);
    };

    new core.Parser(config).processFiles(function () {
      //docs.length.should.equal(6);
      docs.forEach(function (json) {
        should.exist(json);
        should.exist(json.id);
        json.id.should.match(/^[0-9]+/);
      });
    })
  }
};