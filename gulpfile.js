'use strict';
const gulp = require('gulp');
const watchify = require('gulp-watchify');
const server = require('gulp-server-livereload');

const paths = {
  src: [
    'src/**/*.js'
  ],
  dest: 'app/lib/'
};

gulp.task('browserify', watchify(w =>
  gulp.src(paths.src)
    .pipe(w({
      watch: false
    }))
    .pipe(gulp.dest(paths.dest))
));
gulp.task('watchify', watchify(w =>
  gulp.src(paths.src)
    .pipe(w({
      watch: true
    }))
    .pipe(gulp.dest(paths.dest))
));

gulp.task('webserver', function() {
  gulp.src('app')
    .pipe(server({
      livereload: true,
      directoryListing: true
    }));
});

gulp.task('default', ['browserify']);
gulp.task('watch', ['watchify']);
