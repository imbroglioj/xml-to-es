/** generator.js
 *
 * author: jbroglio
 * Date: 5/6/14
 * Time: 9:33 AM
 */

var fs = require('fs'),
    util = require('util'),
    path = require('path')
    ;

function createOutputStreamFromId(infile, json, config) {
    return fs.createWriteStream(path.join(config.output.destDir, json.id + '-' + path.basename(infile)
        .replace(path.extname(infile), config.output.fileExt)), {encoding: 'utf8'});
}

function createAggregateOutputStream(targetFileBase, tag, config) {
    if (config.output.docsPerFile) // > 0
        return fs.createWriteStream(path.join(config.output.destDir,
                targetFileBase + '-' + tag + config.output.fileExt));
    else // === 0
        return fs.createWriteStream(path.join(config.output.destDir,
                targetFileBase + tag + config.output.fileExt));
}

exports.Generator = function (config) {
    var self = this;

    self.generateHtml = function (outputStream, json) {
        var bodyKey = config.input.bodyKey;
        outputStream.write(util.format("<HTML>\n<head><title>%s</title>\n", json.id));
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
                        return;
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
    };

    self.generateJson = function (outputStream, json) {
        outputStream.write(util.format("%j", json));
    };

    self.generatorMap = {
        html: {fn: self.generateHtml },
        json: {fn: self.generateJson }
    };

    self.getGenerator = function () {
        return self.generatorMap[config.output.fmt];
    };

    self.createGenerator = function () {
        config.generator = config.output.docsPerFile === 1 ? self.createOneDocPerFileFun(config)
            : self.createAggregateOutputFun(config);
    };

    self.createOneDocPerFileFun = function (config) {
        return function (json) {
            if (json == ':done') return;
            self.getGenerator().fn.call(self, createOutputStreamFromId(config.infiles[0], json, config), json);
        };
    };

    self.createAggregateOutputFun = function (config) {
        var leadChar = config.output.leadChar;
        var trailChar = config.output.trailChar;
        var sepChar = config.output.sepChar;
        var genFun = self.getGenerator().fn;
        var outputDocCount = 0;
        var outputFileCount = 0;
        var output;
        var targetFileBase = path.basename(config.infiles[0]).replace(path.extname(config.infiles), '');
        if (config.output.docsPerFile === 0) {
            output = createAggregateOutputStream(targetFileBase, '', config);
            if (leadChar) output.write(leadChar);
        }
        var firstTime = true;
        return function (json) {
            if (json == ':done') {
                return output.end(trailChar? trailChar : '');
            }
            if (config.output.docsPerFile > 1
                && outputDocCount % config.output.docsPerFile === 0) {
                if (output) {
                    if (trailChar) output.end(trailChar);
                    else output.end();
                }
                output = createAggregateOutputStream(targetFileBase, outputFileCount++, config);
            } else if (! firstTime){
                output.write(sepChar);
            } else firstTime = false;
            genFun.call(self, output, json);
        }
    };

};