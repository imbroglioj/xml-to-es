# xml-to-es

Takes XML input and translates it into JSON suitable for elasticsearch. There is also an HTML output option suitable
for Chiliad Discovery.

## Usage
    node xml-to-es.js XML_FILE --properties PROPERTIES_FILE [--level LOGLEVEL]

  * XML_FILE: a file containing one or more XML (or SGML) documents
  * PROPERTIES_FILE: a node.js module that controls the structure of the output

## Testing

Currently:
    node xml-to-js test/data/test.sgm --properties lewis-properties.js

## Notes:

This module has been used to translate the SGML found in NLP training and test files (Reuters) posted by David Lewis.


