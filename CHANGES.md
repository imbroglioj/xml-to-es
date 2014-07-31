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
