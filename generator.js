/** generator.js
 *
 * author: jbroglio
 * Date: 5/6/14
 * Time: 9:33 AM
 */



exports.HtmlGenerator = function(fs, util, log){
    var self=this;

    self.generate=function(outputStream, json, bodyKey){
        outputStream.write("<HTML>\n<head><title>json.id</title>\n");
        Object.keys(json).forEach(function(key){
            if (key != bodyKey){
                outputStream.write(util.format('<META name="%s" content="%s">\n', key, json[key]));
            }
        })
        outputStream.write('</head>\n<body>\n');
        if (bodyKey) outputStream.write(json[bodyKey]);
        outputStream.end('\n</body>\n</HTML>\n');
    };
};

exports.JsonGenerator = function(fs, util, log){
    var self=this;

    self.generate = function(outputStream, json){
        outputStream.end(util.format("%j", json));
    }
};