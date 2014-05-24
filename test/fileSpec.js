/** fileSpec
 *
 * author: jbroglio
 * Date: 5/10/14
 * Time: 6:00 PM
 */

var should = require('chai').should()
    , path = require('path')
    , core = require('../index.js')
    , Page = require('./FileSpecPage.js').FileSpecPage
    ;

describe("sgml tests", function () {
    var page= new Page(core, path, should);
    core.logger.info("FileSpec: "+new Date());
    it('should handle one doc', function () {
        page.testSimpleConfig();
    });

    it('should handle six docs', function(){
        page.testGoodTags();
    });

    it('should handle 6 docs with bad sgml', function(){
        page.testBadTags();
    });

    it('should handle test directory with 3 files', function(){
        page.testDirectory();
    });
});
