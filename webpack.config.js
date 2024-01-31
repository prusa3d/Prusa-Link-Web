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
const BACKEND_URL = process.env.BACKEND_URL;

function withDefault(value, defaultValue) {
  return value === undefined ? defaultValue : value;
}

module.exports = (env, args) => {
  const buildLocales = env.locales;

  var printerName = env["PRINTER_NAME"] || DEFAULT_NAME;

  var config = {
    PRINTER_NAME: printerName,
    PRINTER_CODE: printerName.split(" ").slice(-1)[0].toLowerCase(),
    PRINTER_TYPE: env["PRINTER_TYPE"] || "fdm", // "fdm" | "sla"
    FILE_EXTENSIONS: env["FILE_EXTENSIONS"] || [".gcode"],

    APP_NAME: env["APP_NAME"] || "PrusaLink",
    APP_TITLE: env["APP_TITLE"] || env["PRINTER_NAME"] || DEFAULT_NAME,
    APP_VERSION: packageFile.version,

    MODE: env.dev ? "development" : "production",
    UPDATE_INTERVAL: env["UPDATE_INTERVAL"] || 1000,
    CONNECTION_UPDATE_INTERVAL: env["CONNECTION_UPDATE_INTERVAL"] || 5000,
    HTTP_APIKEY: env["HTTP_APIKEY"] || env["http-apikey"] || false,
    HTTP_BASIC: env["HTTP_BASIC"] || env["http-basic"] || false,

    LOCAL_STORAGE_NAME: env["LOCAL_STORAGE_NAME"] || "PrusaLink G-codes",
    WITH_STORAGES: env["WITH_STORAGES"] || ["local", "sdcard"],
    WITH_FILES: withDefault(env["WITH_FILES"], true),
    WITH_SETTINGS: env["WITH_SETTINGS"] || false,
    WITH_CONTROLS: env["WITH_CONTROLS"] || false,
    WITH_REMOTE_UPLOAD: withDefault(env["WITH_REMOTE_UPLOAD"], true),
    WITH_START_PRINT_AFTER_UPLOAD: withDefault(env["WITH_START_PRINT_AFTER_UPLOAD"], true),
    WITH_SERIAL: withDefault(env["WITH_SERIAL"], true),
    WITH_CONNECTION: withDefault(env["WITH_CONNECTION"], true),
    WITH_LOGS: env["WITH_LOGS"] || false,
    WITH_EMBEDDED_SVGS: env["WITH_EMBEDDED_SVGS"] || false,
    WITH_COMMAND_SELECT: withDefault(env["WITH_COMMAND_SELECT"], true),
    WITH_V1_API: withDefault(env["WITH_V1_API"], false),
    WITH_PRINT_BUTTON: withDefault(env["WITH_PRINT_BUTTON"], true),
    WITH_PREVIEW_LAZY_QUEUE: withDefault(env["WITH_PREVIEW_LAZY_QUEUE"], false),
    WITH_DOWNLOAD_BUTTON: withDefault(env["WITH_DOWNLOAD_BUTTON"], true),
    WITH_FAILURES_BEFORE_OFFLINE_SCREEN: withDefault(env["WITH_FAILURES_BEFORE_OFFLINE_SCREEN"], 3),
    WITH_TELEMETRY_NOZZLE_DIAMETER: withDefault(env["WITH_TELEMETRY_NOZZLE_DIAMETER"], false),
    WITH_TELEMETRY_MATERIAL: withDefault(env["WITH_TELEMETRY_MATERIAL"], false),
    WITH_API_KEY_AUTH: withDefault(env["WITH_API_KEY_AUTH"], false),
    WITH_CAMERAS: withDefault(env["WITH_CAMERAS"], false),
    WITH_API_KEY_SETTING: withDefault(env["WITH_API_KEY_SETTING"], false),
    WITH_NAME_SORTING_ONLY: withDefault(env["WITH_NAME_SORTING_ONLY"], false),
    WITH_SYSTEM_UPDATES: withDefault(env["WITH_SYSTEM_UPDATES"], false),

    WITH_SYSTEM_VERSION: withDefault(env["WITH_SYSTEM_VERSION"], false),
    WITH_PRINTER_SETTINGS: withDefault(env["WITH_PRINTER_SETTINGS"], false),
    WITH_USER_SETTINGS: withDefault(env["WITH_USER_SETTINGS"], false),
    WITH_SERIAL: withDefault(env["WITH_SERIAL"], false),
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

  let commitHash = process.env['GIT_COMMIT_HASH'] || require('child_process')
    .execSync('git rev-parse --short HEAD')
    .toString()
    .trim();

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
      new webpack.DefinePlugin({
        __COMMIT_HASH__: JSON.stringify(commitHash)
      })
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

    devServer: {
      host: "0.0.0.0",
      port: 9000,
      ...(
        BACKEND_URL ? {
          proxy: {
            "/": BACKEND_URL
          }
        }: {
          static: path.join(__dirname, "dist"),
          compress: true,
          onAfterSetupMiddleware: function (server) {
            devServer(server.app, config);
            preprocessing.startWatcher(server);
          },
        }
      )
    },
  };
};
