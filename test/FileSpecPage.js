/** fileSpecPage
 *
 * author: jbroglio
 * Date: 5/13/14
 * Time: 6:26 PM
 */

var simpleFile = 'test.sgm',
  goodTags = 'goodTagsTest.sgm',
  badTags = 'badTagsTest.sgm',
  goodTagsgz = 'goodTagsTest.sgm.gz',
  util = require('util')
  ;


exports.FileSpecPage = function (core, path, should) {
  var self = this;

  function jsonDone(json) {return json == ':done';}

  self.jsonDone = jsonDone;
  self.simpleFile = simpleFile;
  self.goodTags = goodTags;
  self.goodTagsgz = goodTagsgz;
  self.badTags = badTags;
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
      config: path.join(__dirname, '../examples/json-config.js'),
      level: 'error',
      '$0': process.argv[0] + ' ' + process.argv[1]
    }, overrides);
  };
  self.makeJsonInlineConfig = function (filename, overrides) {
    if (typeof overrides === 'string') {
      fileext = overrides;
      overrides = null;
    }
    var args = filename.split(/[,]|\s+/).map(function (f) {
      return path.join(__dirname, 'data', f);
    });
    //console.log(util.format("args: %j",args));
    var config = require('../examples/lewis-input-config.js');
    config.output = {
      fmt: "JSON",
      fileExt: ".json",
      destDir: "./json",
      docsPerFile: 1,
      leadChar: '[', // for aggregating
      trailChar: ']',
      sepChar: ','
    };
    return core.resolveParseOptions({
      _: args,
      config: config,
      level: 'error',
      '$0': process.argv[0] + ' ' + process.argv[1]
    }, overrides);

  };
  self.testSimpleConfig = function () {
    var config = self.makeJsonConfig(simpleFile);
    // setting generator like this short-circuits generator finding. Don't use it in code.
    config.generator = function (json) {
      if (jsonDone(json)) return;
      console.log("Using TEST generator");
      should.exist(json);
      should.exist(json.id);
      json.id.should.eql("10003");
      json.body.should.contain("Biogen");
      json.title.should.contain('BIOGEN');
    };
    new core.Parser(config).processFiles();
  };


  self.testTags = function (filename, regex, overrides) {

    var config = self.makeJsonConfig(filename, overrides);
    var docs = [];
    // setting generator like this short-circuits generator finding. Don't use it in code.
    config.generator = function (json) {
      if (jsonDone(json)) return;
      docs.push(json);
    };
    new core.Parser(config).processFiles(function () {
      docs.length.should.equal(6);
      docs.forEach(function (json) {
        should.exist(json);
        should.exist(json.id);
        json.id.should.match(regex);
      });
    });
  };

  self.testGoodTags = function () {
    self.testTags(goodTags, /^[0-9]+/);
  };

  self.testGoodTagsGz = function () {
    self.testTags(goodTagsgz, /^[0-9]+/, {input:{fileExt:'.sgm.gz'}});
  };

  self.testBadTags = function () {
    self.testTags(badTags, /^(missingID|[0-9]+)/);
  };

  self.testDirectory = function () {
    var config = self.makeJsonConfig('');
    var docCount = 0;
    config.infiles.length.should.equal(3);
    // setting generator like this short-circuits generator finding. Don't use it in code.
    config.generator = function (json) {
      if (jsonDone(json)) return;
      docCount++;
    };
    new core.Parser(config).processFiles(function () {
      docCount.should.equal(13);
    });
  };

  self.testSubdirs = function () {
    var config = self.makeJsonConfig('subdir', {input: {fileExt: ".xml"}});
    var docCount = 0;
    config.infiles.length.should.equal(3);
    config.infiles[0].should.contain('.xml');
    config.generator = function (json) {
      if (jsonDone(json)) return;
      docCount++;
    };
    new core.Parser(config).processFiles(function () {
      docCount.should.equal(13);
    });
  }

  self.testSpaceDelim = function () {
    var config = self.makeJsonConfig("subdir/dir1 subdir/dir2 subdir/dir3", {input: {fileExt: ".xml"}});
    var docCount = 0;
    config.infiles.length.should.equal(3);
    config.infiles[0].should.contain('.xml');
    config.generator = function (json) {
      if (jsonDone(json)) return;
      docCount++;
    };
    new core.Parser(config).processFiles(function () {
      docCount.should.equal(13);
    });
  }

};