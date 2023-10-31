/* eslint-disable @typescript-eslint/no-var-requires */
let isDev = process.env.NODE_ENV?.toLowerCase() == "development"
let rrt = require("react-refresh-typescript")
let rrwp = require("@pmmmwh/react-refresh-webpack-plugin")
let autoprefixer = require("autoprefixer")
let path = require("path")
let fs = require("fs")
let webpack = require("webpack")
let html = require("html-webpack-plugin")

/**
 * @type {webpack.Configuration}
 */
let config = {
    // @ts-ignore
    entry: [ isDev && "webpack-hot-middleware/client?path=__hmr&reload=true", "./js/renderer.tsx" ].filter(v => typeof v != "boolean"),
    target: [ "web", "es6" ],
    stats: "normal",
    context: path.resolve(__dirname, "static_src"),
    devtool: !isDev ? false : "inline-source-map",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                options: {
                    getCustomTransformers: () => ({
                        before: [ isDev && rrt.default() ].filter(v => typeof v != "boolean")
                    })
                },
                exclude: /node_modules/
            },
            {
                test: /\.(sc|c|sa)ss$/i,
                use: [
                    {
                        loader: "css-loader",
                        options: {
                            modules: false,
                            exportType: "css-style-sheet",
                            sourceMap: isDev
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    autoprefixer
                                ]
                            }
                        }
                    },
                    {
                        loader: "sass-loader",
                        options: {
                            sourceMap: isDev,
                            sassOptions: {
                                fiber: false
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(pnp|jpeg|jpg|jfif|gif|webp|ico|tif|tiff|bmp)$/i,
                dependency: { not: [ 'url' ] },
                type: 'asset/resource'
            },
            {
                test: /\.svg$/i,
                dependency: { not: [ 'url' ] },
                type: 'asset/inline'
            }
        ]
    },
    output: {
        path: path.resolve("dist", "static"),
        charset: true,
        clean: false,
        publicPath: "/",
        filename: `js${ path.sep }[id].js`
    },
    
    mode: isDev ? "development" : "production",
    plugins: (() => {
        let plugins = [
            new html({
                templateContent: fs.readFileSync(path.resolve(__dirname, "static_src/index.html"), {encoding: 'utf-8'}),
                minify: {
                    caseSensitive: true,
                    keepClosingSlash: true,
                    removeComments: true,
                    minifyCSS: !isDev,
                    minifyJS: !isDev
                },
            }),
            new webpack.ProgressPlugin({
                activeModules: isDev,
                dependencies: isDev,
                entries: isDev,
                modules: isDev,
                profile: isDev
            }),
            new webpack.IgnorePlugin({
                resourceRegExp: /electron/,
            })
        ]
        if (isDev) {
            plugins.push(
                new webpack.HotModuleReplacementPlugin(),
                new rrwp({ overlay: { sockIntegration: 'whm' } })
            )
        }

        return plugins
    })(),
    resolve: {
        extensions: [ ".tsx", ".ts", ".js" ],
        symlinks: false
    },
    optimization: isDev ? {} : (() => {
        let terser = require("terser-webpack-plugin")
        return {
            minimize: true,
            minimizer: [
                new terser({
                    parallel: true,
                    extractComments: true,
                    terserOptions: {
                        compress: {
                            booleans: true,
                            conditionals: true,
                            dead_code: true,
                            drop_debugger: true,
                            if_return: true,
                            join_vars: true,
                            keep_infinity: true,
                            loops: true,
                            negate_iife: false,
                            properties: false,
                        },
                        format: {
                            braces: true,
                            indent_level: 4
                        }
                    }
                })
            ],
            splitChunks: {
                chunks: "async"
            },
            mangleExports: "size",
            removeEmptyChunks: true,
            providedExports: true,
            concatenateModules: true,
            runtimeChunk: true
        }
    })(),
}

module.exports = config

console.log(isDev ? "In Developement Mode" : "")
