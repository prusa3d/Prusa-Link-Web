// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require('path')
const glob = require('glob-all')
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const PurgecssPlugin = require('purgecss-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');


module.exports = (env, args) => {
    let devMode = false;
    // Global variables
    let apiKey = "developer";
    let printer = "Original Prusa SL1";
    let update_timer = 5000;

    if (args && args.mode === 'production') {
        console.log('== Production mode');

        apiKey = (typeof env.apiKey !== "undefined") ? env.apiKey : apiKey;
        printer = (typeof env.printer !== "undefined") ? env.printer : printer;
        update_timer = (typeof env.update_timer !== "undefined") ? env.update_timer : update_timer;
    } else {
        devMode = true;
        printer = (typeof env.printer !== "undefined") ? env.printer : printer;
        console.log('== Development mode');
    }
    console.log(`* printer: ${printer}`);
    console.log(`* update_timer: ${update_timer}`);

    const PATHS = {
        src: path.join(__dirname, 'ui/src')
    }

    return {
        entry: './ui/src/index.tsx',
        output: {
            path: __dirname + '/dist/',
            filename: 'main.[hash].js'
        },
        target: 'web',
        devtool: devMode ? 'source-map' : false,
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.html'],
            alias: {
                'react': 'preact/compat',
                "react-dom/test-utils": "preact/test-utils",
                'react-dom': 'preact/compat'
            }
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: [{
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                        },
                    }],
                },
                {
                    test: /\.scss$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                            options: {
                                hmr: devMode,
                            },
                        },
                        'css-loader',
                        'postcss-loader',
                        'sass-loader',
                    ],
                },
                {
                    test: /\.svg$/,
                    use: {
                        loader: 'svg-url-loader',
                        options: {}
                    }
                },
                {
                    test: /\.(png|jpe?g|gif|ico)$/i,
                    use: [
                        {
                            loader: 'file-loader',
                        },
                    ],
                },
            ]
        },
        devServer: {
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            contentBase: './dist',
            compress: true,
            port: 1234,
            proxy: {
                '/api': 'http://localhost:8080'
            }
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env.APIKEY': JSON.stringify(apiKey),
                'process.env.PRINTER': JSON.stringify(printer),
                'process.env.UPDATE_TIMER': JSON.stringify(update_timer),
                'process.env.DEVELOPMENT': JSON.stringify(devMode)
            }),
            new ForkTsCheckerWebpackPlugin(),
            new MiniCssExtractPlugin({
                filename: devMode ? '[name].css' : '[name].[hash].css',
                chunkFilename: devMode ? '[id].css' : '[id].[hash].css',
            }),
            new HtmlWebpackPlugin({
                title: `${printer} - Prusa Connect`,
                favicon: "./ui/src/assets/favicon.ico",
                template: "./ui/src/index.html"
            }),
            new PurgecssPlugin({
                paths: glob.sync(`${PATHS.src}/**/*`, { nodir: true }),
            })
        ],
        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin()],
        },
    }
}