// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require("path");
const glob = require("glob-all");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const PurgecssPlugin = require("purgecss-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const printers = {
  sl1: "Original Prusa SL1",
  mini: "Original Prusa Mini"
};

module.exports = (env, args) => {
  let devMode = false;
  // Global variables
  let apiKey = "developer";
  let printer = printers["sl1"];
  const update_timer = 5000;

  if (args && args.mode === "production") {
    console.log("== Production mode");

    apiKey = typeof env.apiKey !== "undefined" ? env.apiKey : apiKey;
    printer =
      typeof env.printer !== "undefined" ? printers[env.printer] : printer;
  } else {
    devMode = true;
    printer =
      typeof env.printer !== "undefined" ? printers[env.printer] : printer;
    console.log("== Development mode");
  }
  const update_printer =
    typeof env.update_printer !== "undefined"
      ? env.update_printer
      : update_timer;
  const update_progress =
    typeof env.update_progress !== "undefined"
      ? env.update_progress
      : update_timer;
  const update_files =
    typeof env.update_files !== "undefined" ? env.update_files : update_timer;
  console.log(`* printer: ${printer}`);
  console.log(`* update printer: ${update_printer}`);
  console.log(`* update progress: ${update_progress}`);
  console.log(`* update files: ${update_files}`);

  const PATHS = {
    src: path.join(__dirname, "ui/src")
  };

  return {
    entry: "./ui/src/index.tsx",
    output: {
      path: __dirname + "/dist/",
      filename: "main.[hash].js"
    },
    target: "web",
    devtool: devMode ? "source-map" : false,
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".html"],
      alias: {
        react: "preact/compat",
        "react-dom/test-utils": "preact/test-utils",
        "react-dom": "preact/compat"
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true
              }
            }
          ]
        },
        {
          test: /\.scss$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                hmr: devMode
              }
            },
            "css-loader",
            "postcss-loader",
            "sass-loader"
          ]
        },
        {
          test: /\.svg$/,
          use: {
            loader: "svg-url-loader",
            options: {}
          }
        },
        {
          test: /\.(png|jpe?g|gif|ico)$/i,
          use: [
            {
              loader: "file-loader"
            }
          ]
        }
      ]
    },
    devServer: {
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      contentBase: "./dist",
      compress: true,
      port: 1234,
      proxy: {
        "/api": "http://localhost:8080"
      }
    },
    plugins: [
      new CleanWebpackPlugin(),
      new webpack.DefinePlugin({
        "process.env.APIKEY": JSON.stringify(apiKey),
        "process.env.PRINTER": JSON.stringify(printer),
        "process.env.UPDATE_PRINTER": JSON.stringify(update_printer),
        "process.env.UPDATE_PROGRESS": JSON.stringify(update_progress),
        "process.env.UPDATE_FILES": JSON.stringify(update_files),
        "process.env.DEVELOPMENT": JSON.stringify(devMode)
      }),
      new ForkTsCheckerWebpackPlugin(),
      new MiniCssExtractPlugin({
        filename: devMode ? "[name].css" : "[name].[hash].css",
        chunkFilename: devMode ? "[id].css" : "[id].[hash].css"
      }),
      new HtmlWebpackPlugin({
        title: `${printer} - Prusa Connect`,
        favicon: "./ui/src/assets/favicon.ico",
        template: "./ui/src/index.html"
      }),
      new PurgecssPlugin({
        paths: glob.sync(`${PATHS.src}/**/*`, { nodir: true })
      }),
      new CopyPlugin([{ from: "./ui/src/locales", to: "./locales" }])
    ],
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin()]
    }
  };
};
