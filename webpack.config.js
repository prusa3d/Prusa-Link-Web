const path = require('path')
const glob = require('glob-all')

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const PurgecssPlugin = require('purgecss-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');


module.exports = (env, args) => {
    let devMode = false;

    if (args && args.mode === 'production') {
        console.log('== Production mode');
    } else {
        devMode = true;
        console.log('== Development mode');
    }

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
                    test: /\.svg/,
                    use: {
                        loader: 'svg-url-loader',
                        options: {}
                    }
                }
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
            new ForkTsCheckerWebpackPlugin(),
            new MiniCssExtractPlugin({
                filename: devMode ? '[name].css' : '[name].[hash].css',
                chunkFilename: devMode ? '[id].css' : '[id].[hash].css',
            }),
            new HtmlWebpackPlugin({
                title: "Prusa Connect"
            }),
            new PurgecssPlugin({
                paths: glob.sync(`${PATHS.src}/**/*`, { nodir: true }),
            })
        ],
    }
}