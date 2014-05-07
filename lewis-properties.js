/** lewis-properties.js
 *
 * author: jbroglio
 * Date: 5/7/14
 * Time: 9:04 AM
 */

module.exports = {
    promote:{
        text: ['title', 'dateline','author', {key:'body', target:'body'}],
        '@': [{key: "newid", target:'id'}]

    },
    flatten: ['d'],
    bodyKey: "text",
    targetFileExt: ".json",
    destDir: "./json"
};