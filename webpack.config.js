// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require("path");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const PreprocessingPlugin = require("./tools/preprocessing");
const devServer = require("./tools/server");

module.exports = (env, args) => {
  const printer_conf = {
    mode: env.dev ? "development" : "production",
    type: env.PRINTER,
    title: `Original Prusa ${env.PRINTER}`,
    apiKey: "developer",
    updateInterval: 1000,
  };

  console.log(`===== ${printer_conf.title} =====`);
  console.log(printer_conf);
  console.log(`=============================`);

  const preprocessing = new PreprocessingPlugin({
    printer: printer_conf.type.toLowerCase(),
    templates_dir: path.resolve(__dirname, "templates"),
    assets_dir: path.resolve(__dirname, "src/assets"),
    output_dir: path.resolve(__dirname, "src/views"),
  });

  return {
    mode: printer_conf.mode,
    entry: "./src/index.js",

    output: {
      filename: "[name].[contenthash].js",
      path: path.resolve(__dirname, "dist"),
    },
    devtool: env.dev ? "source-map" : false,
    plugins: [
      preprocessing,
      new webpack.ProgressPlugin(),
      new webpack.DefinePlugin({
        "process.env.MODE": JSON.stringify(printer_conf.mode),
        "process.env.TYPE": JSON.stringify(printer_conf.type),
        "process.env.APIKEY": JSON.stringify(printer_conf.apiKey),
        "process.env.UPDATE_INTERVAL": JSON.stringify(
          printer_conf.updateInterval
        ),
      }),
      new CleanWebpackPlugin(),
      new MiniCssExtractPlugin({
        filename: "[name].[contenthash].css",
      }),
      new HtmlWebpackPlugin({
        title: `${printer_conf.title} - Prusa Connect Local`,
        template: "./src/views/index.html",
        minify: !env.dev,
      }),
    ],

    module: {
      rules: [
        {
          test: /.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                importLoaders: 1,
              },
            },
            "postcss-loader",
          ],
        },
        {
          test: /\.html$/i,
          loader: "html-loader",
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          use: [
            {
              loader: "file-loader",
            },
          ],
        },
      ],
    },

    optimization: {
      minimizer: [new TerserPlugin()],
    },

    //...
    devServer: {
      contentBase: path.join(__dirname, "dist"),
      compress: true,
      port: 9000,
      after: function (app, server, compiler) {
        devServer(app);
        preprocessing.startWatcher(server);
      },
    },
  };
};
