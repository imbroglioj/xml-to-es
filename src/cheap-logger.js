/** cheap-logger.js
 *
 * author: jbroglio
 * Date: 2/27/14
 * Time: 2:26 PM
 */

var util = require('util')
    ;

exports.logger = {
    level:'DEBUG',
    LEVELS:['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'],
    TRACE : 0,
    DEBUG : 1,
    INFO : 2,
    WARN : 3,
    ERROR : 4,
    setLevel:function (level) {
        var lvl = level.toUpperCase();
        if (!lvl) {
            this.error("Non-existent loglevel requested %s. Setting to DEBUG", level);
            this.level = this.DEBUG;
        } else {
            this.level = lvl;
        }
    },
    isEnabled: function(level){
        var l=this.LEVELS.indexOf(level.toUpperCase());
        if (l<0) return false;
        else return(l <= this.level);
    },
    error:function () {
        try {
            console.error("Error! " + util.format.apply(this, arguments));
            var maybeErr = arguments.length ? arguments[arguments.length - 1] : null;
            if (maybeErr) {
                console.error(maybeErr);
                if (maybeErr.stack) console.log(maybeErr.stack);
            }
        } catch (err) {
            console.error("logging error:");
            console.error(err);
        }
    },
    // todo: should all these use console.error so they go to stderr???
    info:function () {if (this.LEVELS.indexOf(this.level) <= this.INFO) console.log(util.format.apply(this, arguments));},
    log: function () {if (this.LEVELS.indexOf(this.level) <= this.INFO) console.log(util.format.apply(this, arguments));},
    debug:function () {if (this.LEVELS.indexOf(this.level) <= this.DEBUG) console.log("DEBUG " + util.format.apply(this, arguments));},
    trace:function () {if (this.LEVELS.indexOf(this.level) <= this.TRACE) console.log("TRACE " + util.format.apply(this, arguments));},
    warn: function () {if (this.LEVELS.indexOf(this.level) <= this.WARN) console.log("WARNING " +util.format.apply(this, arguments));}
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
