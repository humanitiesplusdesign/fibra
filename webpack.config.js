var glob = require("glob");

module.exports = {
  // watch: true,
  context: __dirname,
  entry: {
    ui: './app/index.ts',
    worker: './app/worker-index.ts'
  },
  output: {
    filename: '[name]-bundle.js',
    path: __dirname
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        loader: 'ng-annotate-loader!babel-loader!ts-loader',
        exclude: /node_modules/,
      }
    ]
  },
  resolve: {
    modules: ["node_modules", "app/bower_components"],
    extensions: [".tsx", ".ts", ".js"]
  },
  externals: {
    angular: 'angular',
    fi: 'angular-sparql-service'
  }
};