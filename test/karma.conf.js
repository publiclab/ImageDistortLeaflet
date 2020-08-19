// Karma configuration
// Generated on Tue Jul 08 2014 12:47:31 GMT-0500 (CDT)

module.exports = function(config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '../',

    plugins: [
      require('mocha'),
      require('karma-mocha'),
      require('karma-sinon'),
      require('karma-coverage'),
      require('karma-mocha-reporter'),
      require('karma-chrome-launcher'),
      require('karma-babel-preprocessor'),
    ],

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'sinon'],

    // list of files / patterns to load in the browser
    files: [
      { pattern: 'examples/*.jpg', included: false, served: true },
      'node_modules/leaflet/dist/leaflet-src.js',
      'node_modules/leaflet/dist/leaflet.css',
      'node_modules/leaflet-toolbar/dist/leaflet.toolbar.js',
      'node_modules/leaflet-toolbar/dist/leaflet.toolbar.css',
      'node_modules/webgl-distort/dist/webgl-distort.js',
      'node_modules/glfx/glfx.js',
      'node_modules/chai/chai.js',
      'test/polyfill/*.js',
      'src/util/*.js',
      'src/DistortableImageOverlay.js',
      'src/DistortableCollection.js',
      'src/edit/getEXIFdata.js',
      'src/mapmixins/DoubleClickZoom.js',
      'src/mapmixins/*.js',
      'src/edit/handles/EditHandle.js',
      'src/edit/handles/*.js',
      'src/iconsets/IconSet.js',
      'src/iconsets/KeymapperIconSet.js',
      'src/iconsets/ToolbarIconSet.js',
      'src/edit/actions/EditAction.js',
      'src/edit/actions/*.js',
      'src/edit/toolbars/*',
      'src/edit/DistortableImage.Edit.js',
      'src/edit/DistortableCollection.Edit.js',
      'src/components/DistortableImage.Keymapper.js',
      'test/SpecHelper.js',
      'test/src/*Spec.js',
      'test/src/**/*Spec.js',
    ],

    // so that karma can serve examples/example.png
    proxies: {
      '/examples/': '/base/examples/',
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha', 'coverage'],

    babelPreprocessor: {
      options: {
        presets: ['@babel/preset-env'],
        sourceMap: 'inline',
      },
      filename: function (file) {
        return file.originalPath.replace(/\.js$/, '.es5.js');
      },
      sourceFileName: function (file) {
        return file.originalPath;
      },
    },

    preprocessors: {
      'src/**/*.js': ['babel', 'coverage'],
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE
    // || config.LOG_ERROR
    // || config.LOG_WARN
    // || config.LOG_INFO
    // || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // start these browsers, currently available:
    // - Chrome
    // - ChromeHeadless
    // - ChromeHeadlessNoSandbox
    browsers: ['ChromeHeadlessNoSandbox'],

    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      },
    },

    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 5000,

    // to address Travis build errors; https://github.com/publiclab/Leaflet.DistortableImage/pull/675
    // https://docs.travis-ci.com/user/gui-and-headless-browsers/#karma-and-firefox-inactivity-timeouts
    browserNoActivityTimeout: 40000,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    background: false,

    coverageReporter: {
      reporters: [
        { type: 'text', dir: './coverage', file: 'coverage.txt', subdir: '.' },
        { type: 'lcovonly', dir: './coverage', subdir: '.' },
        { type: 'html', dir: './coverage', subdir: '.' },
      ],
    },
  });
};
