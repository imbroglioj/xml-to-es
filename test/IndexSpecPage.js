/** IndexSpecPage
 *
 * author: jbroglio
 * Date: 5/15/14
 * Time: 4:57 PM
 */

var FileSpecPage = require('./FileSpecPage.js').FileSpecPage
    , util = require('util')
    , child = require('child_process')
    , fs = require('fs')
    ;

exports.IndexSpecPage = function (core, path, should) {
    var self = this;
    var page = new FileSpecPage(core, path, should);
    var IxF = require(path.resolve(__dirname, '../examples/IndexFiles.js'));
    var IndexFiles = IxF.IndexFiles;
    var argv = {
        _: ['N/A'],
        config: path.resolve(__dirname, '../examples/index-es-config.js'),
        level: 'error'
    };

    self.testIndexSingleObject = function (cb) {
        var config = page.makeJsonConfig(page.simpleFile);
        config.generator = function (json) {
            if (page.jsonDone(json)) return;
            var config = IxF.resolveOptions(argv);
            var indexFiles = new IndexFiles(config);
            indexFiles.putMapping();
            indexFiles.submitObject(json, 'N/A', function (err) {
                should.not.exist(err);
                if (cb) cb();
            });
        };

        new core.Parser(config).processFiles();
    };

    // question should we just test file here
    self.testIndexAggregateFile = function (cb) {
        // use child procs and call on files
        var indexDir = path.resolve(process.cwd(), 'jsonTest');
        if (fs.existsSync(indexDir)){
            fs.readdirSync(indexDir, function(f){
                fs.unlinkSync(path.join(indexDir, f));
            });
        } else fs.mkDir(indexDir);
        var config = page.makeJsonConfig(page.goodTags, {output : {destDir:indexDir, docsPerFile:0}});
        config.output.docsPerFile = 0;
        config.output.destDir = indexDir;
        new core.Parser(config).processFiles(function () {
            var jsFile = path.resolve(__dirname, '../examples/IndexFiles.js');

            var config = IxF.resolveOptions({_: [indexDir], level:"WARN", config: argv.config});
            var indexFiles = new IndexFiles(config);
            indexFiles.putMapping(config);
            indexFiles.putFiles([indexDir]);
            indexFiles.getDocumentCount(function(err, json){
                should.not.exist(err);
                should.exist(json);
                should.exist(json.count);
                json.count.should.be.greaterThan(0);
                if (cb) cb();
            });
        });
    };
};