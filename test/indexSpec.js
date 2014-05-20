/** indexSpec
 *
 * author: jbroglio
 * Date: 5/15/14
 * Time: 3:55 PM
 */

var should = require('chai').should()
    , path = require('path')
    , core = require('../lib/xml-to-es')
    , IndexSpecPage = require('./IndexSpecPage.js').IndexSpecPage
    ;

describe("sgml tests", function () {
    var page= new IndexSpecPage(core, path, should);

    it('should index single file', function(done){
        page.testIndexSingleObject(done);
    });

    it('should index json file aggr', function(done){
       page.testIndexAggregateFile(done);
    });

});