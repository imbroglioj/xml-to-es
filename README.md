# xml-to-es

Translates XML (or SGML) documents into JSON documents suitable for ElasticSearch -- or into plain text suitable for
OpenNLP
program input. Additionally, there is an HTML output option intended for use with Chiliad Discovery.

There is also a module and a mapping.json file that can be used to submit the JSON-ized files to ElasticSearch.

This project was created to index SGML collections like
[David Lewis's Reuters collection](http://www.daviddlewis.com/resources/testcollections/reuters21578/)
and to process them NLP projects.

_xml-to-es_ uses libxml-to-js (and the underlying libxmljs) and then massages the resulting JSON object to make it
meaningful for search engines. Elasticsearch can handle nested JSON, but the nested JSON produced automatically from
XML/SGML is not
always what you want for indexing. _xml-to-es_ gives you some fine-grained control over what is produced in JSON.

## Installation
With [npm](http://github.com/isaacs/npm), just do:

    npm install xml-to-es

For github:

   git clone http://github.com/imbroglioj/xml-to-es.git


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



