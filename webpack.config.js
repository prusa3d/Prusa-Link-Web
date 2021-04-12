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
    type: env.PRINTER.toLowerCase(),
    updateInterval: 1000,
    "http-basic": env["http-basic"],
    "http-apikey": env["http-apikey"],
  };

  if (printer_conf.type == "sl1") {
    printer_conf["title"] = "Original Prusa SL1";
    printer_conf["printerFamily"] = "sla";
  } else /* (printer_conf.type == "mini") */ {
    printer_conf["title"] = "Original Prusa Mini";
    printer_conf["printerFamily"] = "fdm";
  }

  console.log(`===== ${printer_conf.title} =====`);
  console.log(printer_conf);
  console.log(`=============================`);

  const preprocessing = new PreprocessingPlugin({
    printer_conf: printer_conf,
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
      publicPath: "",
    },
    devtool: env.dev ? "source-map" : false,
    plugins: [
      preprocessing,
      new webpack.ProgressPlugin(),
      new webpack.DefinePlugin({
        "process.env.MODE": JSON.stringify(printer_conf.mode),
        "process.env.TYPE": JSON.stringify(printer_conf.type),
        "process.env.TITLE": JSON.stringify(printer_conf.title),
        "process.env.PRINTER_FAMILY": JSON.stringify(
          printer_conf.printerFamily
        ),
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
          test: /\.(png|jpe?g|gif|svg|woff2?)$/i,
          use: [
            {
              loader: "file-loader",
            },
          ],
        },
        {
          test: /\.js/,
          loader: path.resolve(__dirname, "tools/loaders/locale_loader"),
          // Directory settings are in locale_loader script
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
        devServer(app, printer_conf);
        preprocessing.startWatcher(server);
      },
    },
  };
};
