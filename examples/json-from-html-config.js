/** json-config
 *
 * author: jbroglio
 * Date: 5/13/14
 * Time: 11:04 AM
 */

var config = require('./html-input-config.js')
  ;
// # config file for xml-to-es
// * output : {
//   * fmt: JSON|HTML or whatever formats you might add to Generation.js
//   * fileExt: output file extension; the input file extension will be replaced with this
//   * destDir: directory for output files
//   * docsPerFile: How many output documents per file.
//     1 => normal for ES;
//     n => for search engines that handle multiple (html) docs in a file
//     0 =>   " unlimited
// }
var generators;
config.output = {
  generator: {
    setConfig: function (c) {
      config = c;
    },
    type: 'JSON',
    fn: function (output, json, cb) {
      if (!generators) {
        var Generators = require('../index.js').Generators;
        generators = new Generators(config);
      }
      generators.generateJson(output, json, cb);
    }
  },
  fmt: "JSON",
  fileExt: ".json",
  destDir: "./json",
  docsPerFile: 1,
  leadChar: '[', // for aggregating
  trailChar: ']',
  sepChar: ','
};

module.exports = config;