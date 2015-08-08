/** Generators
 *
 * author: jbroglio
 * Date: 5/20/14
 * Time: 5:21 PM
 */

var util = require('util')
    ;

exports.Generators = function(config) {
    var self = this;
    var bodyKey = config.input.bodyKey;

    self.generateHtml = function (outputStream, json, cb) {
        outputStream.write(util.format("<HTML>\n<head><title>%s</title>\n", json.title || json.id));
        Object.keys(json).forEach(function (key) {
            if (key != bodyKey) {
                var val = json[key];
                try {
                    if (Array.isArray(val)) {
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
                    } else
                        return outputStream.write(util.format('<META name="%s" content="%s">\n', key,
                            val.replace(/[\n\f\r]/gm, ' ')));
                } catch (err) {
                    console.error(util.format('generate.js:html: %s\n  %s\nAT:%s FROM:%s', err,
                        (err.stack ? err.stack : ''),
                        key, json[key], util.inspect(json, {depth: 2})));
                }
            }
        });
        outputStream.write('</head>\n<body>\n');
        if (bodyKey && json[bodyKey]) outputStream.write(json[bodyKey]);
        outputStream.write('\n</body>\n</HTML>\n');
        if (cb) setImmediate(cb);
    };

    self.generateJson = function (outputStream, json, cb) {
        outputStream.write(util.format("%j", json));
        if (cb) setImmediate(cb);
    };

    self.generateTextOnly = function(outputStream, json, cb){
        if (json.title) outputStream.write(json.title+'\n');
        if (bodyKey && json[bodyKey]) {
            if (config.input.textParaRegex) {
                var arr = json[bodyKey].split(config.input.textParaRegex);
                arr.forEach(function(s){
                    s = s.replace(/[\n\r]+/gm,' ').trim();
                    if (s) outputStream.write(s+'\n    '); // spaces instead of tab
                });
            } else outputStream.write(json[bodyKey] + '\n');
        }
        if (cb) setImmediate(cb);
    };

    self.generatorMap = {
        html: {fn: self.generateHtml },
        json: {fn: self.generateJson },
        text: {fn: self.generateTextOnly}
    };

    // # add a generator to the system for this run
    // * type: the output type key (if the key exists, the function will be replaced
    // * fn: (outputStream, jsonInput) : writes to outputStream
    self.setGenerator = function(type, fn){
        self.generatorMap[type] = fn;
    }
};