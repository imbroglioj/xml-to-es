/** gulpfile
 *
 * author: jbroglio
 * Date: 5/13/14
 * Time: 10:43 AM
 */

var gulp = require('gulp'),
    clean = require('gulp-clean'),
    mocha = require('gulp-mocha'),
    plumber = require('gulp-plumber'),
    notify = require('gulp-notify'),
    util = require('util')
    ;


gulp.task('default', ['clean'],function(){
    gulp.start('js', 'examples', 'package');
});

gulp.task('js', function(){
    return gulp.src('src/*.js')
        .pipe(gulp.dest('dist/lib/'));

});

gulp.task('examples', function(){
    return gulp.src(('examples/*.js'))
        .pipe(gulp.dest('dist/examples'));

});

gulp.task('package', function(){
    return gulp.src(('package.json'))
        .pipe(gulp.dest('dist/'));

});

gulp.task('clean', function(){
    return gulp.src('dist/*', {read: false})
        .pipe(clean());
});

gulp.task('test', function(){
    return gulp.src('test/*Spec.js', {read: false})
        .pipe(plumber({errorHandler: //function(error) {
            //var errs = JSON.stringify(error);
            //notify.onError("Error:"+errs+"\n "+ "<%= error.stack ? error.stack : '' %>")();}}))
            notify.onError("Error: <%= error %>, <%= error.stack ? error.stack : '' %>")}))
        .pipe(mocha({useColors:false, reporter:'spec'}));
});