/** html-properties.js
 *
 * author: jbroglio
 * Date: 5/7/14
 * Time: 9:04 AM
 */
// # config file for xml-to-es
// * output : {
//   * fmt: JSON|HTML or whatever formats you might add to generator.js
//   * fileExt: output file extension; the input file extension will be replaced with this
//   * destDir: directory for output files
//   * docsPerFile: How many output documents per file.
//     1 => normal for ES;
//     n => for search engines that handle multiple (html) docs in a file
//     0 =>   " unlimited
// }
var config = require('./lewis-config.js');

config.output = {
    fmt: "html",
    docsPerFile: '100',
    fileExt: ".html",
    destDir: "./html"
};

module.exports = config;