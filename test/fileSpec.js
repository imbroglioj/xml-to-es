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

    it('should handle deep-nested subdirs', function(){
        page.testSubdirs();
    });
       
    it('should handle space-delimited list of dirs', function(){
        page.testSpaceDelim();

    });
    // last because other tests use uninitialized config...
    it('should handle gzipped file', function(){
        page.testGoodTagsGz();
    });

});
