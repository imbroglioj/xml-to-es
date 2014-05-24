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
    var argv = {
        _: ['N/A'],
        config: path.resolve(__dirname, '../examples/index-es-config.js'),
        level: 'error',
        clean: true
    };

    self.testIndexSingleObject = function (done) {
        var config = page.makeJsonConfig(page.simpleFile);
        config.generator = function (json) {
            if (page.jsonDone(json)) return;
            var config = core.resolveIndexOptions(argv);
            var indexer = new core.ElasticIndexer(config);
            indexer.putMapping(function (err) {
                should.not.exist(err);
                indexer.submitObject(json, 'N/A', function (err) {
                    should.not.exist(err);
                    // callback since only one file
                    if (done) {
                        //core.logger.log("Calling Done on singleObject");
                        done();
                    }
                });
            });
        };

        new core.Parser(config).processFiles();
    };

    // question should we just test file here
    self.testIndexAggregateFile = function (done) {
        // use child procs and call on files
        var indexDir = path.resolve(process.cwd(), 'jsonTest');
        if (fs.existsSync(indexDir)) {
            fs.readdirSync(indexDir, function (f) {
                fs.unlinkSync(path.join(indexDir, f));
            });
        } else fs.mkdirSync(indexDir);
        var config = page.makeJsonConfig(page.goodTags, {output: {destDir: indexDir, docsPerFile: 0}});
        new core.Parser(config).processFiles(function () {
            var config = core.resolveIndexOptions({_: [indexDir], level: "WARN", config: argv.config});
            var indexer = new core.ElasticIndexer(config);
            indexer.putMapping(function (e) {
                should.not.exist(e);
                // give time to make sure parser write is done. todo: making writestream async is tough, but try it.
                indexer.putFiles([indexDir], function (e1) {
                    should.not.exist(e1);
                    indexer.getDocumentCount(function (e2, json) {
                        should.not.exist(e2);
                        should.exist(json);
                        should.exist(json.count);
                        json.count.should.be.greaterThan(0);
                        if (done) {
                            // core.logger.log("Calling Done on aggregate");
                            done();
                        }
                    });
                });
            });
        });

    };
};