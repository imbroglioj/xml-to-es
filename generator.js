/** generator.js
 *
 * author: jbroglio
 * Date: 5/6/14
 * Time: 9:33 AM
 */



exports.HtmlGenerator = function(fs, util, log){
    var self=this;

    self.generate=function(outputStream, json, config){
        var bodyKey = config.bodyKey;
        outputStream.write(util.format("<HTML>\n<head><title>%s</title>\n", json.id));
        Object.keys(json).forEach(function(key){
            if (key != bodyKey){
                var val = json[key];
                try {
                    if (Array.isArray(val)){
                        return outputStream.write(util.format('<META name="%s" content="%s">\n', key,
                            val.join(',').replace(/[\n\f\r]/gm, ' ')));
                    }
                    if (typeof val === 'object') {
                        if (!config.skipObjectFields) {
                            Object.keys(val).forEach(function (k) {
                                var val2 = val[k];
                                if (typeof val2 === 'object') val2 = JSON.stringify(val2);
                                outputStream.write(util.format('<META name="%s" content="%s">\n', key + '.' + k,
                                    val2.replace(/[\n\f\r]/gm, ' ')));
                            });
                        }
                        return;
                    } else
                        return outputStream.write(util.format('<META name="%s" content="%s">\n', key,
                            val.replace(/[\n\f\r]/gm, ' ')));
                } catch (err){
                    console.error(util.format('generate.js:html: %s\n  %s\nAT:%s FROM:%s', err, (err.stack? err.stack:''),
                        key, json[key], util.inspect(json, {depth:2})));
                }
            }
        });
        outputStream.write('</head>\n<body>\n');
        if (bodyKey && json[bodyKey]) outputStream.write(json[bodyKey]);
        outputStream.write('\n</body>\n</HTML>\n');
        outputStream.end();
    };
};

exports.JsonGenerator = function(fs, util, log){
    var self=this;

    self.generate = function(outputStream, json){
        outputStream.write(util.format("%j", json));
        outputStream.end();
    };
};