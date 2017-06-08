var path = require("path");
var webpack = require("webpack");
var CopyWebpackPlugin = require('copy-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var commonConf = require('./webpack.common.config.js');
commonConf.output.path = path.join(__dirname + '/dist-dev')
commonConf.module.rules[0].use.unshift({
  loader: 'angular-hot-loader',
  options: {
    log: false,
    rootElement: 'html'
  }
})
module.exports = [ Object.assign({
  name: 'ui',
  entry: {
    ui: './app/index.ts',
    'webpack-dev-server-client': 'webpack-dev-server/client'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin(),
    new CopyWebpackPlugin([
            { from: 'app/bower_components', to: 'bower_components' }]),
    new HtmlWebpackPlugin({
      chunks: ['ui'],
      filename: 'index.html',
      favicon: 'app/favicon.ico',
      template: 'app/index.pug'
    }),
    new ExtractTextPlugin('styles.css')
  ]
}, commonConf), Object.assign({
  name: 'worker',
  entry: {
    worker: './app/worker-index.ts',
    'webpack-dev-server-client': 'webpack-dev-server/client'
  },
  target: 'webworker',
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin()
  ]
}, commonConf)];
