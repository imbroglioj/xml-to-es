/** fileSpecPage
 *
 * author: jbroglio
 * Date: 5/13/14
 * Time: 6:26 PM
 */

var simpleFile = 'test.sgm',
    goodTags = 'goodTagsTest.sgm',
    badTags = 'badTagsTest.sgm',
util = require('util')
    ;


exports.FileSpecPage = function (core, path, should) {
    var self = this;
    function jsonDone(json){return json == ':done';}
    self.jsonDone = jsonDone;
    self.simpleFile = simpleFile;
    self.goodTags = goodTags;
    self.badTags = badTags;
    self.makeJsonConfig = function (filename, overrides) {
        if (typeof overrides === 'string') {
            fileext=overrides;
            overrides = null;
        }
        var args = filename.split(/[,]|\s+/).map(function(f){
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

    self.testSimpleConfig = function(){
        var config = self.makeJsonConfig(simpleFile);
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


    self.testTags = function(filename, regex){

        var config = self.makeJsonConfig(filename);
        var docs=[];
        config.generator = function (json) {
            if (jsonDone(json)) return;
            docs.push(json);
        };
        new core.Parser(config).processFiles(function(){
            docs.length.should.equal(6);
            docs.forEach(function(json){
                should.exist(json);
                should.exist(json.id);
                json.id.should.match(regex);
            });
        });
    };

    self.testGoodTags = function() {
        self.testTags(goodTags, /^[0-9]+/);
    };

    self.testBadTags = function(){
        self.testTags(badTags, /^(missingID|[0-9]+)/);
    };

    self.testDirectory = function(){
        var config = self.makeJsonConfig('');
        var docCount = 0;
        config.infiles.length.should.equal(3);
        config.generator = function (json) {
            if (jsonDone(json)) return;
            docCount++;
        };
        new core.Parser(config).processFiles(function(){
            docCount.should.equal(13);
        });
    };

    self.testSubdirs = function(){
        var config = self.makeJsonConfig('subdir', {input: { fileExt: ".xml"}});
        var docCount = 0;
        config.infiles.length.should.equal(3);
        config.infiles[0].should.contain('.xml');
        config.generator = function (json) {
            if (jsonDone(json)) return;
            docCount++;
        };
        new core.Parser(config).processFiles(function(){
            docCount.should.equal(13);
        });
    }

    self.testSpaceDelim = function(){
        var config = self.makeJsonConfig("subdir/dir1 subdir/dir2 subdir/dir3", {input: { fileExt: ".xml"}});
        var docCount = 0;
        config.infiles.length.should.equal(3);
        config.infiles[0].should.contain('.xml');
        config.generator = function (json) {
            if (jsonDone(json)) return;
            docCount++;
        };
        new core.Parser(config).processFiles(function(){
            docCount.should.equal(13);
        });
    }

};