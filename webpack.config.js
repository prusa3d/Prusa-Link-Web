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
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env, args) => {
  const buildLocales = env.locales;
  const printer_conf = {
    appName: "PrusaLink",
    mode: env.dev ? "development" : "production",
    type: env.PRINTER.toLowerCase(),
    updateInterval: 1000,
    "http-basic": env["http-basic"],
    "http-apikey": env["http-apikey"],
  };

  let icons;

  if (printer_conf.type == "sl1") {
    printer_conf["title"] = "Original Prusa SL1";
    printer_conf["printerFamily"] = "sla";
    icons = { from: "./src/assets/icons", to: "./" };
  } else if (printer_conf.type == "m1") {
    printer_conf["title"] = "Original Prusa M1";
    printer_conf["printerFamily"] = "sla";
    icons = { from: "./src/assets/icons/favicon-32x32_medical.png", to: "./" };
  } /* (printer_conf.type == "mini") */ else {
    printer_conf["title"] = "Original Prusa Mini";
    printer_conf["printerFamily"] = "fdm";
    icons = { from: "./src/assets/icons/favicon-32x32.png", to: "./" };
  }

  if (buildLocales) {
    console.log(`===== ${printer_conf.title} =====`);
    console.log("building locales");
    console.log(`=============================`);
  } else {
    console.log(`===== ${printer_conf.title} =====`);
    console.log(printer_conf);
    console.log(`=============================`);
  }

  const preprocessing = new PreprocessingPlugin({
    printer_conf: printer_conf,
    templates_dir: path.resolve(__dirname, "templates"),
    assets_dir: path.resolve(__dirname, "src/assets/" + printer_conf.type),
    output_dir: path.resolve(__dirname, "src/views"),
  });

  return {
    mode: printer_conf.mode,
    entry: "./src/index.js",

    output: {
      filename: "[name].[contenthash].js",
      path: path.resolve(__dirname, "dist-" + printer_conf.type),
      publicPath: "",
    },
    devtool: env.dev ? "source-map" : false,
    plugins: [
      preprocessing,
      new webpack.ProgressPlugin(),
      new webpack.DefinePlugin({
        "process.env.APP_NAME": JSON.stringify(printer_conf.appName),
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
      new CopyPlugin({
        patterns: [icons],
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
        buildLocales
          ? {
              test: /\.html$/i,
              loader: path.resolve(
                __dirname,
                "tools/loaders/locale_loader_html"
              ),
              include: path.resolve(__dirname, "src/views/"),
            }
          : {},
        {
          test: /\.(png|jpe?g|gif|svg|woff2?)$/i,
          use: [
            {
              loader: "file-loader",
            },
          ],
        },
        buildLocales
          ? {
              test: /\.js/,
              loader: path.resolve(__dirname, "tools/loaders/locale_loader_js"),
              exclude: path.resolve(__dirname, "node_modules"),
            }
          : {},
      ],
    },

    optimization: {
      minimizer: [new TerserPlugin()],
    },

    //...
    devServer: {
      contentBase: path.join(__dirname, "dist-" + printer_conf.type),
      compress: true,
      port: 9000,
      after: function (app, server, compiler) {
        devServer(app, printer_conf);
        preprocessing.startWatcher(server);
      },
      // To run Prusa Link against the real server
      /*
      port: 9000,
      proxy: {
        "/": "http://localhost:8080",
      },
      */
    },
  };
};
