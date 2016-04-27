/** cheap-logger.js
 *
 * author: jbroglio
 * Date: 12/1/14
 * Time: 2:26 PM
 */

var util = require('util')
    ;

exports.Logger = function(includeDate){
	  var self = this;
    self.level='DEBUG';
    var LEVELS=['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'],
    TRACE = 0,
		DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    noShowDate=function(lvl){if (lvl) return lvl; else return '';},
    showDate = noShowDate;

    self.printDate = function(tf){
        if (tf) showDate=function(lvl){ 
            return '['+new Date().toISOString()+'] '+(lvl?lvl:'');}
        else showDate=noShowDate;
    };

    self.setLevel = function (level) {
        if (!level) {
            self.error("Non-existent loglevel requested %s. Setting to DEBUG", level);
            self.level = this.DEBUG;
        } else {
          self.level = level.toUpperCase();;
        }
    };
    self.isEnabled = function(level){
        var l=LEVELS.indexOf(level.toUpperCase());
        if (l<0) return false;
        else return(l <= self.level);
    };
    self.error =function () {
        try {
            console.error(showDate('ERROR: ' ) + util.format.apply(this, arguments));
            var maybeErr = arguments.length ? arguments[arguments.length - 1] : null;
            if (maybeErr) {
                console.error(maybeErr);
                if (maybeErr['stack']) console.log(maybeErr.stack);
            }
        } catch (err) {
            console.log("logging error:");
            console.error(err);
        }
    };
    self.info = function () {if (LEVELS.indexOf(self.level) <= INFO) console.error(showDate("INFO: ")+ util.format.apply(this, arguments));};
    self.log = function () {console.log(showDate()+util.format.apply(this, arguments));};
    self.debug = function () {if (LEVELS.indexOf(self.level) <= DEBUG) console.error(showDate("DEBUG: ")+util.format.apply(this, arguments));};
    self.trace = function () {if (LEVELS.indexOf(self.level) <= TRACE) console.error(showDate("TRACE: ")+ util.format.apply(this, arguments));};
    self.warn = function () {if (LEVELS.indexOf(self.level) <= WARN) console.error(showDate("WARNING: ")+util.format.apply(this, arguments));};

    if (includeDate) this.printDate(includeDate);
};

exports.collectErrors = function ce(db, procname, callback) {
    db.lastError({j:true}, function (err) {
        try {
            if (err) {
                exports.logger.error("%s", procname, err);
                return db.close(); //setImmediate(doWord);
            }
            setImmediate(callback(err));
        } catch (err2) {
            exports.logger.error("Closing :", err2);
            process.exit(1);
        }
    });
};
