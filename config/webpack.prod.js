const fs = require('fs')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const { merge } = require('webpack-merge')
const webpack = require('webpack')

const base = require('./webpack.config.js')
const paths = require('./paths')

module.exports = merge(base, {
  mode: 'production',
  devtool: false,
  output: {
    path: paths.build,
    publicPath: '/',
    filename: 'scripts/[name].[contenthash].bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.(scss|css)$/,
        use: [
          MiniCssExtractPlugin.loader, 'css-loader'
        ],
      },
    ],
  },
  plugins: [
    // Extracts CSS into separate files
    new MiniCssExtractPlugin({
      filename: 'styles/[name].[contenthash].css',
      chunkFilename: 'styles/[id].css',
    }),
    new webpack.BannerPlugin({
      banner: `
      IF-Script  v0.2.1
      ==============

      Built: ${new Date().toDateString()}

      Copyright (c) ${new Date().getUTCFullYear()} The IF-Script Contributors
      Author(s): Mihir Jichkar

      MIT Licensed
      https://github.com/PlytonRexus/if-script.git\n
     `
    }),
    new CleanWebpackPlugin()
  ],
  optimization: {
    minimize: true,
    minimizer: [new CssMinimizerPlugin(), '...'],
    runtimeChunk: {
      name: 'runtime',
    },
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
})
