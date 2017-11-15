module.exports = {
  devtool: 'source-map',
  entry: {
    background_page: './background_page.js',
    content_script: './content_script.js'
  },
  output: {
    path:  __dirname + '/dist',
    filename: '[name].js',
    sourceMapFilename: '[name].js.map'
  }
};
