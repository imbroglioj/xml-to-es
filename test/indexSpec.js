/** indexSpec
 *
 * author: jbroglio
 * Date: 5/15/14
 * Time: 3:55 PM
 */

var should = require('chai').should()
    , path = require('path')
    , core = require('../index.js')
    , request = require('superagent')
    ;
var IndexSpecPage, page;

process.on('uncaughtException', function(err){
    core.logger.error("uncaughtException -- ", err);
});

describe("Index tests (results not valid if ES not running)", function () {
    core.logger.info("indexSpec: "+new Date());
    var noES;

    // have to call this every time since async
    function checkES(cb){
        if (noES) return cb("ES not running.");
        request
            .get('http://localhost:9200/')
            .end(function(err, res){
                if (err || !res.ok) {
                    noES = true;
                    core.logger.warn("*** Will skip index test because ElasticSearch not running at localhost:9200 ***");
                    return cb(err);
                }
                cb();
            });
    }
    // is there a dynamic way to get mocha to skip tests?
    checkES(function(err){
        if (err) expect.true.to.be(false);
        if (!err) {
            IndexSpecPage = require('./IndexSpecPage.js').IndexSpecPage,
                page = new IndexSpecPage(core, path, should);
        }
    });

    it('should index single file', function(done) {
        checkES(function (err) {
            if (err) return done();
            page.testIndexSingleObject(done);
        });
    });

    it('should index json file aggr', function(done) {
        checkES(function (err) {
            if (err) return done();
            //this.timeout(2000);
            page.testIndexAggregateFile(done);
        });
    });

});