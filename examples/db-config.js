/** db-config
 *  Example file for sending JSON output to mongodb instead of file.
 * author: jbroglio
 * Date: 5/13/14
 * Time: 11:04 AM
 */

var config = require('./lewis-input-config.js')
    , mongo = require('mongoskin')  // this is in dev-dependencies
    , db = mongo.db('mongodb://localhost:27017/test?reconnect=true')
    , xmltest = db.collection('xmltest')
    , util = require('util')
    ;
xmltest.drop();

// # config file for xml-to-es
// * output : {
//   * fmt: JSON|HTML or whatever formats you might add to Generation.js
//   * fileExt: output file extension; the input file extension will be replaced with this
//   * destDir: directory for output files
//   * docsPerFile: How many output documents per file.
//     1 => normal for ES;
//     n => for search engines that handle multiple (html) docs in a file
//     0 =>   " unlimited
//   * noFile : set to true if you are supplying a generator that handles its own destination(s)
//   * generator : object:
//        {type: /* SAME as fmt value */, fn: /* 2 choices */ };
//     note: type value __must__ match fmt property value due to internal. (If 'fmt' is undefined it will be set to
//        the 'type' value
//     if (noFile == true) fn: function(data, cb)
//     else fn : function(stream, data, cb)
// }
config.output = {
    noFile: true,
    generator: {
        type: "db",
        fn: function(data, cb){
            if (data == ':done') return cb ? setImmediate(cb): null; // end of input
            xmltest.insert(data, function(err,docs){
                if (err){
                    console.error(util.format("Error storing doc in db: %s on %j" ,err, util.inspect(data)));
                    setImmediate(cb,err);
                } else setImmediate(cb);
            });
    }},
    callback: function(){db.close();}
};

module.exports = config;