/* eslint-disable @typescript-eslint/no-var-requires */
let debug = process.env.MODE !== "p" && process.env.MODE !== "production"
debug = false
let path = require("path")
let fs = require("fs")
let webpack = require("webpack")
let html = require("html-webpack-plugin")
let css = require("mini-css-extract-plugin")
let terser = require("terser-webpack-plugin")

/**
 * 
 * @param  {...string} dir The path to the directory to check
 * @returns A list of files with there absolute path
 */
let getFiles = (...dir) => {
    /**
     * @type {string[]}
     */
    let returner = []
    for (let i of fs.readdirSync(path.resolve(...dir), { encoding: "utf-8", withFileTypes: true })) {
        if (i.isFile()) {
            returner.push(path.resolve(...dir, i.name))
        } else if (i.isDirectory()) {
            returner.push(...getFiles(path.resolve(...dir, i.name)))
        } else {
            console.warn(`Found a non file or directory in ${ path.resolve(...dir) }`)
        }
    }

    return returner
}

let listOfHtmlObjs = []
for (let i of fs.readdirSync(path.resolve("static_src"), { encoding: "utf-8", withFileTypes: true })) {
    let validEnding = i.name.endsWith(".html") || i.name.endsWith(".htm") || i.name.endsWith(".shtml") || i.name.endsWith(".shtm")
    if (i.isFile() && validEnding) {
        // console.log(path.resolve("static_src", i.name))
        listOfHtmlObjs.push(new html({
            inject: "head",
            chunks: [ (i.name).replace(".html", '') ],

            templateContent: fs.readFileSync(path.resolve("static_src", i.name), { encoding: 'utf-8' }),
            filename: path.resolve("dist", "static", i.name),
            minify: {
                caseSensitive: true,
                keepClosingSlash: true,
                // removeComments: true,
                minifyCSS: !debug,
                minifyJS: !debug
            },
        }))
    }
}

class CopyAssetsPlugin {

    constructor (options = CopyAssetsPlugin.defaultOptions) {
        this.options = { ...CopyAssetsPlugin.defaultOptions, ...options }
    }

    /**
     * 
     * @param {webpack.Compiler} complier 
     */
    apply(complier) {
        // complier.hooks.afterCompile.tapAsync("Copy Assets", async (compilation, cb) => {
        //     complier.hooks.entryOption.tap("Copy Assets", (context, entry) => {
        //         console.log(context, entry)
        //         cb()
        //         return true
        //     })
        //     // console.log("Moving ")
        // })
        if (!fs.existsSync(this.options.from)) {
            throw new ReferenceError(`Error: no such file or directory ${ this.options.from }. Did you set the 'from' option?`)
        }
        complier.hooks.emit.tapAsync("Copy Assets", (c, cb) => {
            if (!fs.existsSync(path.resolve(this.options.from))) {
                return
            }
            fs.mkdirSync(path.resolve(this.options.to), { recursive: true })
            // console.log(path.resolve(this.options.to))
            fs.cpSync(path.resolve(this.options.from), path.resolve(this.options.to), {
                recursive: this.options.recursive,
                dereference: true,
                errorOnExist: false,
                force: true,
                preserveTimestamps: true,
                filter: (src) => {
                    let notExclude = true
                    for (let i of this.options.excludeExt) {
                        if (src.endsWith(i)) {
                            notExclude = false
                        }
                    }
                    if (fs.statSync(src).isDirectory()) {
                        console.log(src)
                        let files = getFiles(src)
                        let length = files.length
                        for (let i of files) {
                            for (let y of this.options.excludeExt) {
                                if (i.endsWith(y)) { length-- }
                            }
                        }
                        return length > 0
                    } else {
                        // console.log(notExclude, src)
                        return notExclude
                    }
                }
            })
            cb()
        })
    }
    /**
     * @type {{excludeExt: string[], from: string, to: string, recursive: boolean}}
     */
    options
    static defaultOptions = {
        /**
         * File extensions to exclude
         * 
         * @default ["temp", "tmp", "bak"]
         */
        excludeExt: [ "temp", "tmp", "bak" ],
        /**
         * Path to copy from
         * 
         * @default "assets"
         */
        from: "assets",
        /**
         * Path to copy to
         * 
         * @default "dist/assets"
         */
        to: "dist/assets",
        /**
         * Whether to copy recursively
         * 
         * @default false
         */
        recursive: false
    }
}

let getEntries = () => {
    /**@type {{[name: string]: string}} */
    let returner = {}
    for (let file of [ ...getFiles("static_src", "js") ]) {
        // let t = {}
        if (file.endsWith(".d.ts")) { continue; }
        returner[ `${ file.replace(/\.[A-z0-9]+$/, '').replace(path.resolve("static_src", "js") + path.sep, '') }` ] = file
        // returner.push(t)
    }
    // console.log(returner)
    return returner
}

/**
 * @type {webpack.Configuration}
 */
let config = {
    entry: getEntries(),//[ path.resolve("static_src", "index.tsx"), ...getFiles("static_src", "js") ],
    target: [ "web", "es6" ],
    stats: "normal",
    devtool: !debug ? false : "eval-source-map",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/
            },
            {
                test: /\.css$/i,
                use: [ css.loader, "css-loader" ]
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
        filename: `js${ path.sep }[id].js`
    },
    mode: debug ? "development" : "production",
    plugins: [
        ...listOfHtmlObjs,
        new css({
            experimentalUseImportModule: true,
            filename: `css${ path.sep }[name].css`,
        }),
        // new CopyAssetsPlugin({
        //     from: path.resolve("static_src", "assets"),
        //     to: path.resolve("dist", "static"),
        //     excludeExt: [ "temp", "tmp", "bak" ],
        //     recursive: true
        // }),
        new CopyAssetsPlugin({
            from: path.resolve("static_src", "css"),
            to: path.resolve("dist", "static", "css"),
            excludeExt: [ "temp", "tmp", "bak" ],
            recursive: true
        }),
        new webpack.ProgressPlugin({
            activeModules: debug,
            dependencies: debug,
            entries: debug,
            modules: debug,
            profile: debug
        }),
        new webpack.IgnorePlugin({
            resourceRegExp: /electron/,
        })
    ],
    resolve: {
        extensions: [ ".tsx", ".ts", ".js" ],
        symlinks: false
    },
    optimization: {
        minimize: !debug,
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
        concatenateModules: !debug,
        runtimeChunk: !debug
    },
}

module.exports = config

console.log(debug ? "In Developement Mode" : "")
