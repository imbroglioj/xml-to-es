# xml-to-es

Translates XML (or SGML) documents into JSON documents suitable for ElasticSearch -- or into plain text suitable for
OpenNLP
program input. Additionally, there is an HTML output option intended for use with Chiliad Discovery.

There is also a module and a mapping.json file that can be used to submit the JSON-ized files to ElasticSearch.

This project was created to experiment with SGML collections like
[David Lewis's Reuters collection](http://www.daviddlewis.com/resources/testcollections/reuters21578/)
and to process them for NLP projects.

_xml-to-es_ uses _libxml-to-js_ (and the underlying _libxmljs_) and then massages the resulting JSON object to make it
meaningful for search engines. Elasticsearch can handle nested JSON, but the nested JSON produced automatically from
XML/SGML is not
always what you want for indexing. _xml-to-es_ gives you some fine-grained control over what is produced in JSON.

This was done as a node.js pre-processor rather than a river to allow more flexibility in JSON post-processing during
 early development and to produce input for a variety of search engines.

### XML/SGML structural errors

XML/SGML structure in the wild is not always perfect, so _xml-to-es_ handles some anomalies:

    * missing closing tag
    * missing opening tag

_xml-to-es_ handles these by examining the XML/SGML input before it is JSON-ized.

It will not currently handle a
sequence where the first document has a missing closing tag and the second document has a missing opening tag.  That
would be possible but is left for future work as needed. (The input file _test/data/twoDocsNoSepTagsTest.sgm_ is
available for
experimentation on that problem.)

## Installation
With [npm](http://github.com/isaacs/npm), just do:

    npm install xml-to-es

For github:

   git clone http://github.com/imbroglioj/xml-to-es.git

## Documentation

The ````examples```` and ````test```` directories show a number of ways to use and control these modules.

### Examples directory
  * ````convert.js```` : uses lib/xml-to-es.js to convert XML/SGML to massaged JSON
  * ````indexFiles.js```` : using an index config file, will submit a set of JSON files for indexing to ElasticSearch
   (requires that ElasticSearch be running!)
  * ````*-config.js```` : various input and output configuration files to be used with convert.js and indexFiles.js

## Conversion from XML/SGML to JSON/HTML

    node examples/convert.js FILES_OR_DIRECTORY --config CONFIG_FILE [--level LOGLEVEL]

  * FILES_OR_DIRECTORY: a filename, directory name or comma-delimited list of filenames and/or directory names
  leading to files that containone or more XML (or SGML) documents. The config file may contain config.input.fileExt to
   control which files are read.
  * CONFIG_FILE: a node.js module that controls the structure of the input and output
  * LOGLEVEL: default is DEBUG

### Example

    node examples/convert.js /data/reuters --config examples/json.config --level WARN

## Indexing JSON files with ElasticSearch

Make sure you have ElasticSearch running and listening at the default address.

    node examples/indexFiles.js FILES_OR_DIRECTORY --config INDEX_CONFIG

  * FILES_OR_DIRECTORY: filename, directory name or comma-delimited list of file/directory names which designate one
  or more files of JSON documents. Unlike ElasticSearch, indexFiles.js can handle files with JSON arrays of documents.
  NOTE: the 'id' field of each document will be submitted as the ID to ElasticSearch.

### Example

    node examples/indexFiles.js jsonFiles/ --config examples/index-es-config


## Testing

Change to xml-to-es directory:

    mocha --reporter spec



