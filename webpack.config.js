// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require("path");
const packageFile = require("./package.json");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const PreprocessingPlugin = require("./tools/preprocessing");
const devServer = require("./tools/server");

const DEFAULT_NAME = "Original Prusa 3D Printer";

module.exports = (env, args) => {
  const buildLocales = env.locales;

  var config = {
    PRINTER_NAME: env["PRINTER_NAME"] || DEFAULT_NAME,
    PRINTER_CODE: env["PRINTER_NAME"].split(" ").slice(-1)[0].toLowerCase(),
    PRINTER_TYPE: env["PRINTER_TYPE"] || "fdm", // "fdm" | "sla"

    APP_NAME: env["APP_NAME"] || "PrusaLink",
    APP_TITLE: env["APP_TITLE"] || env["PRINTER_NAME"] || DEFAULT_NAME,
    APP_VERSION: packageFile.version,

    MODE: env.dev ? "development" : "production",
    UPDATE_INTERVAL: env["UPDATE_INTERVAL"] || 1000,
    CONNECTION_UPDATE_INTERVAL: env["CONNECTION_UPDATE_INTERVAL"] || 5000,
    HTTP_APIKEY: env["HTTP_APIKEY"] || env["http-apikey"] || false,
    HTTP_BASIC: env["HTTP_BASIC"] || env["http-basic"] || false,

    WITH_SETTINGS: env["WITH_SETTINGS"] || false,
    WITH_CONTROLS: env["WITH_CONTROLS"] || false,
    WITH_LOGS: env["WITH_LOGS"] || false,
    WITH_FONT: env["WITH_FONT"] || false,
    WITH_EMBEDDED_SVGS: env["WITH_EMBEDDED_SVGS"] || false,
  };
  config["TPL_ASSETS_PATH"] = config["PRINTER_CODE"] == "m1" ? "../assets/m1" : "../assets";

  const env_variables = Object.fromEntries(
    Object.entries(config)
      .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
  );

  if (buildLocales) {
    console.log(`===== ${config.APP_TITLE} =====`);
    console.log("building locales");
    console.log(`=============================`);
  } else {
    console.log(`===== ${config.APP_TITLE} =====`);
    console.log(config);
    console.log(`=============================`);
  }

  const preprocessing = new PreprocessingPlugin({
    config,
    templates_dir: path.resolve(__dirname, "templates"),
    assets_dir: path.resolve(__dirname, "src" + config["TPL_ASSETS_PATH"].slice(2)),
    output_dir: path.resolve(__dirname, "src/views"),
  });

  return {
    mode: config.MODE,
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
      new webpack.DefinePlugin(env_variables),
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
        buildLocales ?
          {
            test: /\.html$/i,
            loader: path.resolve(__dirname, "tools/loaders/locale_loader_html"),
            include: path.resolve(__dirname, "src/views/"),
          } : {},
        {
          test: /\.(png|jpe?g|gif|svg|woff2?)$/i,
          use: [
            {
              loader: "file-loader",
            },
          ],
        },
        buildLocales ?
          {
            test: /\.js/,
            loader: path.resolve(__dirname, "tools/loaders/locale_loader_js"),
            exclude: path.resolve(__dirname, "node_modules"),
          } : {},
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
        devServer(app, config);
        preprocessing.startWatcher(server);
      },
    },
  };
};
