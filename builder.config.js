/* eslint-disable @typescript-eslint/no-var-requires */
let path = require("path")
let fs = require("fs")
let appConfig = require("./package.json")

fs.rmSync(path.resolve(__dirname, "./build"), { recursive: true })
fs.mkdirSync(path.resolve(__dirname, "./build"), { recursive: true })
fs.copyFileSync(path.resolve(__dirname, "app/.pnp.cjs"), path.resolve("app/dist", ".pnp.cjs"))
// fs.copyFileSync(path.resolve(__dirname, "app/.pnp.loader.mjs"), path.resolve("app/dist", ".pnp.loader.mjs"))

/**
 * @type {import("builder-util").ArchType[]}
 */
let winArches = [
    "x64"
]

/**
 * @type {import("app-builder-lib/out/core").Publish}
 */
let publish = [
    {
        provider: "github",
        
    },
    {
        provider: "generic",
        url: "https://waterwolfies.com/downloads/ytdl_prog/${os}/",
    }
]

/**
 * @type {import("electron-builder").Configuration}
 */
let config = {
    appId: `com.waterwolfies.${appConfig.name}`,
    publish,
    appImage: {
    },
    icon: path.resolve(__dirname, "icon.png"),
    directories: {
        output: path.resolve(__dirname, "build", "${os}/${version}/${arch}")
    },
    compression: "normal",
    copyright: `Copyright © 2022 waterwolf9910 <waterwolf9910@waterwolfies.com>`,
    pkg: {
        allowAnywhere: true,
        license: path.resolve(__dirname, "LICENSE")
    },
    buildDependenciesFromSource: true,
    files: [
        "dist",
    ],
    extraResources: [
        {
            from: "app/.yarn",
            to: ".yarn",
            filter: [
                "!releases${/*}",
                "!sdks${/*}",
                "!install-state.gz",
            ]
        },
        {
            from: "app/.pnp.cjs",
            to: ".pnp.cjs"
        },
        // {
        //     from: "app/.pnp.loader.mjs"
        //     to: ".pnp.loader.mjs"
        // }
    ],
    win: {
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
    },
    nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        license: path.resolve(__dirname, "LICENSE"),
        runAfterFinish: true,
    },
    squirrelWindows: {
        msi: true,
    },
    linux: {
        category: "AudioVideo",
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

if (process.platform == "win32") {
    let _icoinv = setInterval(() => {
        let icon = path.resolve(__dirname, "build/${os}/${version}/${arch}/.icon-ico/icon.ico")
        let location = icon.replace('${version}', appConfig.version)
        if (fs.existsSync(icon) && !fs.existsSync(location)) {
            if (fs.statSync(icon).size > 10) {
                fs.mkdirSync(path.dirname(location), { recursive: true })
                fs.copyFileSync(icon, location)
                clearInterval(_icoinv)
            }
        }
    })
}
