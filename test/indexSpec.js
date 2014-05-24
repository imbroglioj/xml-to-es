/** indexSpec
 *
 * author: jbroglio
 * Date: 5/15/14
 * Time: 3:55 PM
 */

var should = require('chai').should()
    , path = require('path')
    , core = require('../index.js')
    , IndexSpecPage = require('./IndexSpecPage.js').IndexSpecPage
    ;

describe("sgml tests", function () {
    var page= new IndexSpecPage(core, path, should);
    core.logger.info("indexSpec: "+new Date());
    it('should index single file', function(done){
        page.testIndexSingleObject(done);
    });

    it('should index json file aggr', function(done){
        //this.timeout(2*60*1000);
       page.testIndexAggregateFile(done);
    });

});