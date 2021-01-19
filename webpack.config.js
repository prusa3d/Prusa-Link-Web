const path = require("path");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const PrusaPreprocessingPlugin  = require("./preprocessing");

module.exports = async (env, args) => {
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

  return {
    mode: printer_conf.mode,
    entry: "./src/index.js",

    output: {
      filename: "[name].[contenthash].js",
      path: path.resolve(__dirname, "dist"),
    },

    plugins: [
      new PrusaPreprocessingPlugin({
        printer: printer_conf.type.toLowerCase(),
        templates: ["router.js", "index.html"],
        templates_dir: "preprocessing",
        output: "src",
      }),
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
        template: "./src/index.html",
        minify: !env.dev,
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
          options: {
            // Disables attributes processing
            attributes: false,
          },
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
      port: 9000
    }
  
  };
};
