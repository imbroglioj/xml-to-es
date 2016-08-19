/** Generation.js
 *
 * author: jbroglio
 * Date: 5/6/14
 * Time: 9:33 AM
 */

var fs = require('fs'),
  util = require('util'),
  path = require('path'),
  Generators = require('./Generators.js').Generators
  ;

var log;
function createOutputStreamFromId(infile, json, config) {
  var fname = json.id ? json.id+(config.output.fileExt.startsWith('.')? '' : '.')+config.output.fileExt
    : path.basename(infile).replace(path.extname(infile), config.output.fileExt);
  return fs.createWriteStream(path.join(config.output.destDir, fname), {encoding: 'utf8'});
}

function createAggregateOutputStream(targetFileBase, tag, config) {
  if (config.output.docsPerFile) // > 0
    return fs.createWriteStream(path.join(config.output.destDir,
      targetFileBase + '-' + tag + config.output.fileExt));
  else // === 0
    return fs.createWriteStream(path.join(config.output.destDir,
      targetFileBase + tag + config.output.fileExt));
}

exports.Generation = function (config) {
  log = config.log;
  var self = this;
  var generators = new Generators(config);
  self.generators = generators;
  self.getGenerator = function () {
    return generators.generatorMap[config.output.fmt];
  };

  self.setGenerator = function (type, fn) {
    generators.setGenerator(type, fn);
  };

  if (config.output.generator) {
    var gen = config.output.generator;
    if (!config.output.fmt) config.output.fmt = gen.type;
    if (!new RegExp(gen.type, 'i').test(config.output.fmt)) {
      throw new Error(util.format("config.outout.generator type %s does not match specified config.output.fmt: %s. "
        + "exiting...",
        gen.type, config.output.fmt));

    } else {
      if (typeof gen.setConfig === 'function') gen.setConfig(config);
      else log.warn("generator lacks a setConfig property: your generator might not be working with the final config.");
      self.setGenerator(gen.type, gen.fn);
    }
  }

  self.instantiateGenerator = function () {
    if (config.output.noFile) config.generator = self.getGenerator().fn;
    else if (config.output.docsPerFile === 1)
      config.generator = self.createOneDocPerFileFun(config);
    else
      config.generator = self.createAggregateOutputFun(config);
  };

  self.createOneDocPerFileFun = function (config) {
    return function (json, cb) {
      if (json == ':done') return cb? setImmediate(cb): null;
      self.getGenerator().fn.call(self, createOutputStreamFromId(config.input.currentFile, json, config), json, cb);
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
    var targetFileBase = config.output.filePrefix || path.basename(config.input.currentFile||"NoName",
        path.extname(config.input.currentFile));
    if (config.output.docsPerFile === 0) {
      output = createAggregateOutputStream(targetFileBase, '', config);
      if (leadChar) output.write(leadChar);
    }
    var firstTime = true;
    return function (json, cb) {
      if (json == ':done') {
        output.end(trailChar ? trailChar : '');
        return cb ? setImmediate(cb) : null;
      }  // else we have a doc
      if (config.output.docsPerFile > 1 && outputDocCount++ % config.output.docsPerFile === 0) {
        if (output) {
          if (trailChar) output.end(trailChar);
          else output.end();
        }
        output = createAggregateOutputStream(targetFileBase, outputFileCount++, config);
      } else if (!firstTime) {
        if (sepChar) output.write(sepChar);
      } else firstTime = false;
      genFun.call(self, output, json, cb);
    };
  };

};
