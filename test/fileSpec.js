/** fileSpec
 *
 * author: jbroglio
 * Date: 5/10/14
 * Time: 6:00 PM
 */

var should = require('chai').should
    , fs = require('fs')
    , core = require('../src/xml-to-es')
    ;

describe ("one good file of 6", function(){
    var config = core.resolveOptions({
        _: path.join(__dirname,data,'goodTagsTest.sgm'),
        config: path.join(__dirname,'../examples/json-config.js'),
        '$0':process.argv[0]+' '+process.argv[1]
    });


});
