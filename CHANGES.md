# v0.3.10
  * Broke out collectFiles from parseOptions processing to make multi-threaded (Cluster) use easier;
  * Demoted ElasticIndexer.js log message from INFO to DEBUG.

# v0.3.9
  * Fixed bug where fileExt is applied not to end of filename but only to formal extension.

# v0.3.8
  * Fixed resolving generator fn in nofile case

# v0.3.7
  * use setImmediate to trim stack on callbacks

# v0.3.6
  * Fix bug in Generation.js, line 69, createOneDocPerFile not running callback.

# v0.3.5
  * Add and correct added generator test

# v0.3.4
  * fix make generators available in Generation.js

# v0.3.3
  * Fixed setGenerator produced incorrect structure.

# v0.3.2
  * make generators available in Generation.js

# v0.3.1
  * handle filename properly when id is "" or " ", etc.

# v0.3.0
  * BREAKING CHANGE: config.input.preProcess takes a callback argument cb(json). This enables async processing in
  preprocess (doh).

# v0.2.17
  * Check that database has been created and attempt to create if not.

# v0.2.16
  * If config.index exists, initialize the indexer.

# v0.2.15
  * make test of fmt and type case-insensitive by using regexp

# v0.2.14
  * throw exception if ignoring user's generator

# v0.2.13
  * fix logger npe in Generation.js

# v0.2.12
  * handle setConfig property in output.generator so that generator can insure that it has
    the final version of the config object.

# v0.2.11
  * allow parser and indexer to take config as an object as well as a filename

# v0.2.10
  * fixes to ElasticIndexer

# v0.2.5
  * change lewis-config to lewis-input-config
  * added cheerio for parsing html input

# v0.2.4
  * substituted config.input.currentFile for config.inputFiles[0] where feasible

# v0.2.3
  * fixed bug where giving a list of input file names (not comma delimited) gives an error.
  * added recursive processing to subdirectories of directories submitted

# v0.2.2
  * put input file path (or URI, or dbRef) on config.input.currentFile during runs
  * pass config to input-config preProcess function.

# v0.2.1
  * fixed dbconfig to run callback correctly

# v0.2.0  API additions but no breaking API changes (applies to 0.1.4, 0.1.5 as well)
  * added
    * ability to define your own generator in output config
    * ability to specify a callback in output config to be called when all files are processed
  * example to save json output to mongodb
  * changed requires in examples/convert.js and example/indexFiles.js so that they can be run in place.
    Added comment for developer to change them for use outside the examples dir.

# v0.1.5
  * Skip indexing tests if ES is not running.

# v0.1.4
  * for input-config
    * added preProcess for gross output manipulation before other processing
    * added delete to enable property deletion
    * added rename to enable property key renaming (useful after promoting)

# v0.1.3

# v0.1.2   May 27, 2014
  * Changed ````require```` calls in ````examples```` scripts to suit npm usage, so that examples run correctly when
   copied to a top level directory (above ````node_modules/xml-to-es````).

# v0.1.1   May 24, 2014

 * Create index.js to collect API exports into one require.
 * Modify tests and examples to load index.js.
 * API using lib/xml-to-es and lib/indexFiles backward compatible.
 * Fixed bug on --clean, request.delete --> request.del; adjusted tests to exercise
 * Fixed serious bug where attempt to get the mapping was creating the index with wrong settings because of URL
 misspelling
 * cheap-logger ````log```` method now logs absolutely; it ignores log levels

