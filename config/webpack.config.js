const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const {CleanWebpackPlugin} = require('clean-webpack-plugin')

const paths = require('./paths')

module.exports = {
  entry: {
    main: path.resolve(__dirname, '../src/web/js/index.js'),
    preview: path.resolve(__dirname, '../src/web/preview/index.js')
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'scripts/[name].bundle.js',
    publicPath: '/'
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'IF | Web',
      template: path.resolve(__dirname, '../src/web/index.template.html'), // template file
      filename: 'index.html', // output file,
      favicon: paths.src + '/assets/images/if-logo-nobg.png',
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      title: 'IF | Preview',
      template: path.resolve(__dirname, '../src/web/preview/index.template.html'), // template file
      filename: 'preview/index.html', // output file,
      favicon: paths.src + '/assets/images/if-logo-nobg.png',
      chunks: ['preview']
    })
  ],
  module: {
    rules: [
      // JavaScript
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      // Images
      {
        test: /\.(?:ico|gif|png|jpg|jpeg)$/i,
        type: 'asset/resource',
      },
      // Fonts and SVGs
      {
        test: /\.(woff(2)?|eot|ttf|otf|svg|)$/,
        type: 'asset/inline',
      }
    ],
  },
  resolve: {
    modules: [paths.src, 'node_modules'],
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@': paths.src,
    },
  }
}
