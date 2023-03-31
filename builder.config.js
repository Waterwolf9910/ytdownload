/* eslint-disable @typescript-eslint/no-var-requires */
let path = require("path")
let fs = require("fs")
let appConfig = require("./package.json")

fs.copyFileSync(path.resolve(".pnp.cjs"), path.resolve("dist", ".pnp.cjs"))
fs.copyFileSync(path.resolve(".pnp.loader.mjs"), path.resolve("dist", ".pnp.loader.mjs"))

/**
 * @type {import("builder-util").ArchType[]}
 */
let winArches = [
    "x64"
]

/**
 * @type {import("app-builder-lib/out/core").Publish}
 */
let publish = {
    provider: "generic",
    url: "https://waterwolfies.com/downloads/ytdl_prog/${os}/",
}

/**
 * @type {import("electron-builder").Configuration}
 */
let config = {
    appId: `com.waterwolfies.${ appConfig.name }`,
    // appId: `com.waterwolfies.youtube_download`,
    publish,
    appImage: {
        // publish: {
        //     ...basePublish,
        //     url: basePublish.url + "/linux",
        // }
    },
    icon: path.resolve(__dirname, "icon.png"),
    // productName: appConfig.name,
    directories: {
        // buildResources: null,
        output: path.resolve(__dirname, "build", "${os}/${arch}/${version}")
    },
    compression: "normal",
    copyright: `Copyright © 2022 waterwolf9910 <waterwolf9910@waterwolfies.com>`,
    pkg: {
        allowAnywhere: true,
        license: path.resolve(__dirname, "LICENSE")
    },
    buildDependenciesFromSource: true,
    remoteBuild: false,
    files: [
        "**/*",
        "!build${/*}",
        "!builds${/*}",
        "!static_src${/*}",
        "!src${/*}",
        "!bak${/*}",
        "!.vscode${/*}",
        "!.eslint.json",
        "!builder.config.js",
        "!docker-compose.yml",
        "!Dockerfile",
        "!README.md",
        "!tsconfig.json",
        "!webpack.config.js"
        // "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
        // "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
        // "!**/node_modules/*.d.ts",
        // "!**/node_modules/.bin",
        // "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
        // "!.editorconfig",
        // "!**/._*",
        // "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
        // "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
        // "!**/{appveyor.yml,.travis.yml,circle.yml}",
        // "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}",
        // ".yarn${/*}",
    ],
    extraResources: [
        ".yarn${/*}",
        ".pnp.cjs",
        ".pnp.loader.mjs"
    ],

    // beforePack: (ctx) => {

    // },
    win: {
        // publish: {
        //     ...basePublish,
        //     url: basePublish.url + "/win"
        // },
        target: [
            {
                target: "nsis",
                arch: winArches
            },
            {
                target: "portable",
                arch: winArches
            },
            {
                target: "msi",
                arch: winArches
            },
        ]
    },
    msi: {
        oneClick: false,
        runAfterFinish: false,
        // publish: {
        //     ...basePublish,
        //     url: basePublish.url + "/win"
        // }
    },
    nsis: {
        oneClick: false,
        // publish: {
        //     ...basePublish,
        //     url: basePublish.url + "/win"
        // },
        allowToChangeInstallationDirectory: true,
        license: path.resolve(__dirname, "LICENSE"),
        runAfterFinish: true,
    },
    squirrelWindows: {
        msi: true,
        // publish: {
        //     ...basePublish,
        //     url: basePublish.url + "/win"
        // }
    },
    linux: {
        category: "AudioVideo",
        // publish: {
        //     ...basePublish,
        //     url: basePublish.url + "/linux"
        // },
        target: [
            {
                target: "deb",
            },
            {
                target: "tar.gz",
            },
            {
                target: "zip",
            },
            {
                target: "AppImage",
            },
        ]
    },
    deb: {
        depends: [
            "libnotify4",
            "libxtst6",
            "libnss3",
            "libavcodec58",
            "libavformat58",
        ],
        priority: "optional"
    },
}

module.exports = config;
