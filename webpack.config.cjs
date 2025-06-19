const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './popup.js', 
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'popup.js',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'popup.css'),
          to: path.resolve(__dirname, 'dist/popup.css'),
          noErrorOnMissing: false,
        },
        {
          from: path.resolve(__dirname, 'popup.html'),
          to: path.resolve(__dirname, 'dist/popup.html'),
          noErrorOnMissing: false,
        },
        {
          from: path.resolve(__dirname, 'manifest.json'),
          to: path.resolve(__dirname, 'dist/manifest.json'),
          noErrorOnMissing: false,
        },
        {
          from: path.resolve(__dirname, 'options.html'),
          to: path.resolve(__dirname, 'dist/options.html'),
          noErrorOnMissing: false,
        },
        {
          from: path.resolve(__dirname, 'options.js'),
          to: path.resolve(__dirname, 'dist/options.js'),
          noErrorOnMissing: false,
        },
        {
          from: path.resolve(__dirname, 'icons'),
          to: path.resolve(__dirname, 'dist/icons'),
          noErrorOnMissing: false,
        },
      ],
    }),
  ],
  mode: 'production', 
};