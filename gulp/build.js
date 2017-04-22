var gulp = require('gulp');
var nib = require('nib');

var webpack = require( 'webpack' );
var webpackConfig = require( '../webpack.config.js' );
var webpackStream = require( 'webpack-stream' );

var $ = require('gulp-load-plugins')();

gulp.task('styles', function() {
  return gulp.src("app/**/*.styl")
    .pipe($.plumber({ errorHandler: $.notify.onError("<%= error.stack %>") }))
    .pipe($.sourcemaps.init())
    .pipe($.stylus({ use: [nib()] }))
    .pipe($.sourcemaps.write())
    .pipe($.autoprefixer("last 1 version"))
    .pipe(gulp.dest(".tmp"));
});

// var tsProject = $.typescript.createProject('tsconfig.json',{typescript:require('typescript')});
// gulp.task('scripts', function() {
//   return tsProject.src()
//     .pipe($.plumber({ errorHandler: $.notify.onError("<%= error.stack %>") }))
//     .pipe($.sourcemaps.init())
//     .pipe(tsProject()).js
//     .pipe($.typescriptAngular({ moduleName: 'fibra' }))
//     .pipe($.sourcemaps.write())
//     .pipe(gulp.dest(".tmp"));
// });

gulp.task('scripts', function() {
  return gulp.src('app/index.ts')
    .pipe($.plumber({ errorHandler: $.notify.onError("<%= error.stack %>") }))
    .pipe( webpackStream( webpackConfig, webpack ) )
    .pipe(gulp.dest(".tmp"));
});

gulp.task('templates', function() {
  return gulp.src("app/**/*.pug")
    .pipe($.plumber({ errorHandler: $.notify.onError("<%= error.stack %>") }))
    .pipe($.cached())
    .pipe($.sourcemaps.init())
    .pipe($.pug({pretty: true}))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(".tmp"));
});

gulp.task('docs', function() {
  return tsProject.src()
    .pipe($.plumber({ errorHandler: $.notify.onError("<%= error.stack %>") }))
    .pipe($.typedoc({
        module: "es6",
        target: "es6",
        mode: 'file',
        out: "docs/",
        name: "Fibra"
    }));
});

gulp.task('clean', function(cb){
  return require('del')(['.tmp', 'dist'], cb);
});

gulp.task('lint', function() {
  return gulp.src('app/components/**/*.ts')
    .pipe($.tslint({ formatter: 'verbose' }))
    .pipe($.tslint.report());
});

gulp.task('build', function(cb){
  return require('run-sequence')('clean', 'wire', ['templates', 'styles', 'scripts'], cb);
});
