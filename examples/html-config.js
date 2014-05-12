/** html-properties.js
 *
 * author: jbroglio
 * Date: 5/7/14
 * Time: 9:04 AM
 */
// # config file for xml-to-es
//
// * fmt: JSON|HTML or whatever formats you might add to generator.js
// * promote: which values should be moved to top level: foo.key.key2 => foo.key2
// * flatten: which XML elements are place-holders and should be removed with their contentents subsumed under the parent key
//      Example: <PLACES><D>usa</D><D>ussr</D></PLACES will be turned into an array by lib2xml as:
//               PLACES:{D: [{"#":usa}, {"#":ussr}]}
//      flatten: ['d'] will turn this into
//               places: ['usa', 'ussr']
//      Note: '#" is automatically flattened. See test/data/test.sgm for an input example.
// * bodyKey: Only meaningful for HTML output. The text that should go in the HTML <BODY>
// * skipObjectFields: If true, will skip any fields which are an object; if false (default) will write them as
//    name="OBJECTNAME.KEY" content="VALUE" for each key in the sub-object. (depth of 2)
// ## output file naming
//
// * targetFileExt: output file extension; the input file extension will be replaced with this
// * destDir: directory for output files

module.exports = {
    fmt: "html",
    skipObjectFields: false,
    promote:{
        text: ['title', 'dateline','author', 'body'],
        '@': [{key: "newid", target:'id'}]
    },
    flatten: ['d'],
    bodyKey: "body",
    targetFileExt: ".html",
    destDir: "./html"
};