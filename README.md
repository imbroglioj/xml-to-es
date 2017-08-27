# NOTE: I now recommend [fast-xml2js](github.com/codyrigney92/fast-xml2js).

It performs well and is extremely convenient to use for the xml-to-json conversion.

# xml-to-es

````xml-to-es```` was originally written to translate [David Lewis's Reuters collection in SGML](http://www.daviddlewis
.com/resources/testcollections/reuters21578/) intocleaned-up JSON for ElasticSearch.

It has been improved to translate XML into JSON, HTML, raw text. Output is to one file per XML document or one file
N XML documents or one file for the output of all the input XML documents.

In version 0.2.0, ````xml-to-es```` can accept a ````generator```` argument that supports output to any kind of sink,
including a stream.  There is an example of this in ````examples/db-config.js````.

Using ````examples/convert.js````, documents can be submitted as a comma-delimited list or as a directory name with
Translates XML (or SGML) documents into JSON documents suitable for ElasticSearch -- or into plain text suitable for
OpenNLP program input. Additionally, there is an HTML output option intended for use with Chiliad Discovery and an
open-ended option that allows such things as pushing the documents to a database.

There is also a module ````examples/indexFiles.js```` and a mapping.json file that can be used as examples to submit
the JSON-ized files to ElasticSearch.

_xml-to-es_ uses _libxml-to-js_ (and the underlying _libxmljs_) and then massages the resulting JSON object to make it
meaningful for search engines. Elasticsearch can handle nested JSON, but the nested JSON produced automatically from
XML/SGML is almost never what you want for indexing or any other purpose. In addition, most XML is by nature very
noisy. _xml-to-es_ gives you some fine-grained control over what is produced in JSON.

A simple config file lets you

  * preProcess the JSON to get it in shape for subsequent processing as described in the remaining bullet items
  * un-nest the XML by promoting important elements to top level
  * turn attributes (represented as '@' properties) into elements using promotion
  * flatten arrays which are rendered as ````[{ '#' : value1}, {'#' : value2},...]```` by libxml*.
  * delete elements you don't need
  * rename elements

### XML/SGML structural errors

XML/SGML structure in the wild is not always perfect, so _xml-to-es_ handles some anomalies:

    * missing closing tag
    * missing opening tag

_xml-to-es_ handles these by examining the XML/SGML input before it is JSON-ized.

It will not currently handle a sequence where the first document has a missing closing tag and the second document
has a missing opening tag.  That would be possible but is left for future work as needed. (The input file
````test/data/twoDocsNoSepTagsTest.xml```` is available for
experimentation on that problem. Note: extension is ````xml```` instead of ````sgm```` to protect tests.)

## Installation
With [npm](http://github.com/isaacs/npm), just do:

    npm install xml-to-es

Then, ````cd```` to xml-to-es directory and run:

    npm install

For github:

   git clone http://github.com/imbroglioj/xml-to-es.git

## Documentation

The ````examples```` and ````test```` directories show a number of ways to use and control these modules.

### Examples directory
  * ````convert.js```` : uses ````lib/xml-to-es.js```` to convert XML/SGML to massaged JSON
  * ````indexFiles.js```` : using an index config file, will submit a set of JSON files for indexing to ElasticSearch
   (requires that ElasticSearch be running!)
  * ````*-config.js```` : various input and output configuration files to be used with ````convert.js```` and
  ````indexFiles.js````

#### Notes on running examples:
  3. If you want to copy ````convert.js```` or ````indexFiles.js```` to top level to experiment with modifying
  them, you will have to
     1. change ````require(path.resolve(__dirname,'index.js'))```` to ````require('xml-to-es')````
     2. install the ````optimist```` module (using ````npm````).

### JSON tweaks

Some JSON tweaks are provided using the config file ````input```` property:

#### input-config

  * ````preProcess````: modify the JSON object (config.json) in any way
  * ````promote````: move a nested element/object-property to be a top level object property
  * ````delete````: remove unneeded properties from the resulting JSON
  * ````rename````: rename property keys in the JSON
  * ````flatten````: Somewhat like ````promote````, but typically used to remove noise from what should be an array.
    Some SGML kludges can create complicated object nesting in the JSON which can completely obscure the fact that we
  have an
  array as a property value. (To see a _before_ example, temporarily remove the ````flatten```` property from a copy
  of ````lewis-input-config.js````.) Once you
  identify the offending XML tag ('d' for the Reuters collection), _xml-to-es_ will remove the extra tag and flatten
  the array value by removing place-holder property names like '#'.

#### output-config
The output-config must ````require```` the input-config you want.

The output config file (examples: ````json-config.js````, ````db-config.js````, ````text-only-config.js````) give
examples of the output options.

  * fmt: JSON|HTML or whatever formats you might add to Generation.js
  * noFile: true if there is a user-supplied generator and it creates its own output sink
  * fileExt: extension of the output file (the output file name is created from the input file name, the JSON id
    property and the output.fileExt).  IF REGEX, terminate with "$"
  * destDir: directory for output files
  * docsPerFile:
    * 0: put everything in one output file
    * 1: 1 output file per XML/SGML input
    * 100: 1 output file for every 100 XML/SGML input files
  * leadChar, sepChar, trailChar: in case of multiple documents per output file, how to group them (````[ , ]````
    for JSON
  * generator: an object for supplying your own output handler (see also ````examples/db-config````)
      {type: /* SAME as fmt value */,
       fn: if (noFile == true) fn: function(data, cb)
           else fn : function(stream, data, cb)
       setConfig: function(conf) that sets the closure var config to the actual current complete config
       }
    note: type value __must__ match fmt property value due to internal issues.
          (If 'fmt' is undefined it will be set to the 'type' value)


# Example usage

## Conversion from XML/SGML to JSON/HTML

    node examples/convert.js FILES_OR_DIRECTORY --config CONFIG_FILE [--level LOGLEVEL]

  * FILES_OR_DIRECTORY: a filename, directory name or comma-delimited list of filenames and/or directory names
  leading to files that containone or more XML (or SGML) documents. The config file may contain config.input.fileExt to
   control which files are read.
  * CONFIG_FILE: a node.js module that controls the structure of the input and output
  * LOGLEVEL: default is DEBUG

__Example__: ````node examples/convert.js /data/reuters --config examples/json.config --level WARN````

## Indexing JSON files with ElasticSearch

Make sure you have ElasticSearch running and listening at the server and port listed in the index config file.

    node examples/indexFiles.js FILES_OR_DIRECTORY --config INDEX_CONFIG

  * FILES_OR_DIRECTORY: filename, directory name or comma-delimited list of file/directory names which designate one
  or more files of JSON documents. Unlike ElasticSearch, ````indexFiles.js```` can handle files containing JSON
  arrays of documents.

  NOTE: the 'id' field of each document will be submitted as the ID to ElasticSearch.

__Example__: ````node examples/indexFiles.js jsonFiles/ --config examples/index-es-config````


## Testing

In you have mocha installed globally, ````cd```` to xml-to-es directory and run:

    mocha --reporter spec



