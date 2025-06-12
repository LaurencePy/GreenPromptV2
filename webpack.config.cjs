const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = { // Corrected this line
  entry: './src/popup.js', // This assumes your popup.js is in a 'src' folder
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'popup.bundle.js',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        // Remove model copying if models are not used locally anymore
        // {
        //   from: path.resolve(__dirname, 'models'),
        //   to: path.resolve(__dirname, 'dist/models'),
        //   noErrorOnMissing: true,
        // },
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
      ],
    }),
  ],
  // Optional: If you still see issues, ensure mode is set, though CLI usually handles this
  // mode: 'production', // Or 'development'
};
