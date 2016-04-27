/** lewis-properties.js
 *
 * author: jbroglio
 * Date: 5/7/14
 * Time: 9:04 AM
 */

// # input config file for xml-to-es
// * input : {
//   * promote: which values should be moved to top level: foo.key.key2 => foo.key2
//   * flatten: which XML elements are place-holders and should be removed with their contentents subsumed under the parent key
//        Example: <PLACES><D>usa</D><D>ussr</D></PLACES will be turned into an array by lib2xml as:
//                 PLACES:{D: [{"#":usa}, {"#":ussr}]}
//        flatten: ['d'] will turn this into
//                 places: ['usa', 'ussr']
//        Note: '#" is automatically flattened. See test/data/test.sgm for an input example.
//   * bodyKey: Only meaningful for HTML output. The text that should go in the HTML <BODY>
// }

module.exports = {
    input : {
        preProcess: function(config, cb){
            //console.log("preProcess: Processing file:"+config.input.currentFile);
            if (config.json.reuters && Object.keys(config.json).length===1) config.json=config.json.reuters;
            return cb ? setImmediate(cb) : config.json;
        },
        fileExt: '.sgm',
        promote: {
            text: ['title', 'dateline', 'author', 'body'],
            '@': [
                {key: "newid", target: 'id'}
            ]
        },
        flatten: ['d'],
        bodyKey: "body",
        textParaRegex : /[\n\r]+(\t|[ ]{4,8})/mg
    }
};