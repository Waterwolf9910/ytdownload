// TODO: Use ytdl.createAgent for priv + age restricted videos
/* eslint-disable @typescript-eslint/ban-ts-comment */
// process.env.ELECTRON_ENABLE_LOGGING='true'
import electron = require("electron")
// eslint-disable-next-line @typescript-eslint/no-var-requires
import path = require("path")
electron.app.isPackaged ? require(path.resolve(process.resourcesPath, ".pnp.cjs")).setup() : require("../../.pnp.cjs").setup()
import fs = require("fs")
import Module = require("module")
let orequire = Module.prototype.require
//@ts-ignore
Module.prototype.require = function () {
    // eslint-disable-next-line prefer-rest-params
    if (arguments[0] == "electron" || arguments[0].startsWith("electron/")) {
        return electron;
    }
    // eslint-disable-next-line prefer-rest-params
    return orequire.apply(this, arguments)
}

// import _ffmpegPath = require("ffmpeg-static")
// import child_process = require("child_process")
import http = require("http")
import https = require("https")
import ytdl = require("@distube/ytdl-core")
import ytpl = require("ytpl")
import express = require("express")
// import dayjs = require("dayjs")
import _random = require("wolf_utils/random.js")
// import events = require("events")
import os = require('os')
import updater = require("electron-updater")
// import readline = require("readline")
// import FuncQueue = require("./libs/func_queue")
import Queue = require("./libs/queues")
process.env["YTDL_NO_UPDATE"] = "1"

let eapp = electron.app
electron.nativeTheme.themeSource = "dark"
//@ts-ignore
// let ffmpegPath: string = _ffmpegPath
let random = _random.createRandom(4, 9)
let app = express()

let autoUpdater: typeof updater.autoUpdater = updater.autoUpdater

autoUpdater.autoRunAppAfterInstall = false
autoUpdater.autoDownload = false
autoUpdater.forceDevUpdateConfig = !eapp.isPackaged;
autoUpdater.allowDowngrade = true;

// autoUpdater.channel = "beta"

autoUpdater.on("update-available", async () => {
    let selection = await electron.dialog.showMessageBox(mainWin, {
        type: "question",
        message: "An update is available, update?",
        buttons: [ "yes", "no" ],
        title: "Update"
    })
    if (selection.response == 0) {
        autoUpdater.downloadUpdate()
    }
})

autoUpdater.on("update-downloaded", async () => {
    let selection = await electron.dialog.showMessageBox(mainWin, {
        title: "Install Updates",
        message: "Updates Downloaded, install them now?",
        type: "question",
        buttons: [ "yes", "no" ]
    })
    if (selection.response == 0) {
        autoUpdater.quitAndInstall()
    }
})

autoUpdater.on("download-progress", async (info) => {
    mainWin.webContents.send("update", JSON.stringify(info))
})

autoUpdater.on("checking-for-update", () => {
    console.log("Checking")
})

// let cache = path.resolve(eapp.getPath("userData"), "cache")
// fs.mkdirSync(cache)
process.chdir(process.resourcesPath)

let temp = path.resolve(eapp.getPath("userData"), "./temp")
fs.mkdirSync(path.resolve(eapp.getPath("userData"), "ffmpeg"), { recursive: true })
let base_config: program_config = {
    concurrent_dl: os.cpus().length / 2,
    concurrent_process: os.cpus().length / 2,
    output: path.resolve(eapp.getPath("desktop"), "./media"),
    audio_format: 'mp3',
    video_format: 'mkv',
    theme: "dark",
    cookies: []
}

let config = base_config
fs.rmSync(temp, { recursive: true, force: true })
fs.mkdirSync(temp, { recursive: true })
type infoPL = {
    id: number,
    video: string,
    audio: string,
    thumbnail: string
    output: string,
    title: string,
    track: number,
    query: ytpl.Item
}

let getIdFromHandle = async (url: string) => {
    let html: string[] = []

    await new Promise((resolve) => {
        https.get(url, (stream) => {
            stream.on("data", (c) => {
                html.push(c.toString('utf-8'));
            })
            stream.on("end", resolve);
        })
    })

    if (html.length == 0) {
        return null;
    }
    let inital = html.filter(v => v.includes("/channel/"))
    if (inital.length == 0) {
        return null
    }
    let url_tags = inital[0].split("<").filter(v => v.includes("/channel/"))
    if (url_tags.length == 0) {
        return null
    }
    let properties = url_tags[0].split(' ').filter(v => v.includes("/channel/"))
    if (properties.length == 0) {
        return null
    }

    return properties[0].replace('href=', '').replaceAll('"', '').replace('https://www.youtube.com/channel/', '').replace('>', '')
}

//TODO: deduplicate option (by id)
electron.ipcMain.handle("getpl", async (ev, link: string, reversePL = false, customRegExp: string[] = [], start = -1, end = -1) => {
    let agent = ytdl.createAgent(config.cookies, {})
    let items: { title: string, query: ytpl.Item }[] = []
    let pl: ytpl.Result
    try {
            pl = await ytpl(link, { limit: Infinity, requestOptions: {dispatcher: agent.dispatcher} })
    } catch {
        try {
            pl = await ytpl(await getIdFromHandle(link), { limit: Infinity, requestOptions: { dispatcher: agent.dispatcher } })
        } catch {
            ev.sender.send("error", "Error getting playlist info")
            return
        }
    }
    if (pl == null) {
        ev.sender.send("error", "No Playlist Found")
        return
    } else {
        ev.sender.send("log", `Playlist ${pl.title} Found!`)
    }

    let si = start == -1 ? 0 : (start - 1)
    let ei = end == -1 ? -1 : (end - 1)
    let list = pl.items.slice(si, ei)

    for (let query of list) {
        let title = query.title
        for (let regexp of customRegExp) {
            try {
                let split = regexp.split('\\,')
                let rex = new RegExp(split[0], split[1])
                title = title.replace(rex, '')
            } catch (err) {
                ev.sender.send("error", "Invalid Regular Expression")
                ev.sender.send("error", err)
                return
            }
        }

        if (!query.isLive) {
            items.push({ title, query })
        }
    }

    if (reversePL) {
        items.reverse()
    }

    ev.sender.send("selector", { items, title: pl.title, url: pl.url, start_index: si })
})

// let dlqueue = new FuncQueue(config.concurent_dl, true)
// let procqueue = new FuncQueue(config.concurent_process, true)
let queue = new Queue(config.concurrent_dl, true)


electron.ipcMain.handle("dlpl", (ev, pl_info: infoPL[], audio_only: boolean, title: string, start_index: number) => {
    console.log("Starting pl dl")
    mainWin.webContents.send("log", "Downloading Playlist")
    let playlist_title = title
    if (audio_only) {
        title = title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '').replace(/\.$/, '').replaceAll(/ +/g, ' ')
        fs.mkdirSync(path.resolve(config.output, "Music", "Various Artists", title), { recursive: true })
    } else {
        title = title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '').replace(/\.$/, '').replaceAll(/ +/g, ' ')
        fs.mkdirSync(path.resolve(config.output, "TV Shows", title, "Season 00"), { recursive: true })
    }
    for (let i = 0; i < pl_info.length; i++) {
        let thisId = id++
        let query = pl_info[ i ].query
        let thisTrack = `${start_index + i + 1}`
        if (thisTrack.length < 2) {
            thisTrack = `0${thisTrack}`
        }
        let info: infoPL = {
            id: thisId,
            video: path.resolve(temp, `${thisId}_video.mp4`),
            audio: path.resolve(temp, `${thisId}_audio.mp4`),
            thumbnail: path.resolve(temp, `${thisId}_thumbnail.jpeg`),
            output: path.join('${dir}', `\${replace_title}${pl_info[ i ].title.replaceAll("w/", 'with').replace(/[<>:"/\\|?*]/g, '').replace(/\.$/, '').replaceAll(/ +/g, ' ')}`),
            title: pl_info[ i ].title.replace(/\.$/, '').replaceAll(/ +/g, ' '),
            track: start_index + i + 1,
            query,
        }
        let onError = (err) => {
            if (err) {
                mainWin.webContents.send("error", `Error Downloading: ${info.title}`)
                return `Error Downloading: ${info.title}`
            }
        }
        fs.writeFileSync(path.resolve(temp, "id.json"), JSON.stringify({ id }))
        if (!audio_only) {
            info.output = info.output.replace('${dir}', path.resolve(config.output, "TV Shows", title, "Season 00") ).replace("${replace_title}", `S00e${thisTrack} - `)
        } else {
            info.output = info.output.replace('${dir}', path.resolve(config.output, "Music", "Various Artists", title)).replace("${replace_title}", ''/* `${thisTrack} -` */)
            // fs.writeFileSync(path.resolve(config.output, "Music", "Various Artists", data.title, "track.json"), JSON.stringify({ track }))
        }
        let alt_num = 0
        while (fs.existsSync(info.output + (alt_num > 0 ? `(alternate ${alt_num}).` : '.') + (audio_only ? config.audio_format : config.video_format))) {
            ++alt_num;
        }
        info.output = info.output + (alt_num > 0 ? `(alternate ${alt_num}).` : '.') + (audio_only ? config.audio_format : config.video_format)
        if (alt_num > 0) {
            info.title = `${info.title} (alternate ${alt_num})`
        }
        fs.writeFileSync(info.output, "Checker File")

        queue.add(audio_only, {
            audio_path: info.audio,
            author_name: query.author.name,
            from_pl: true,
            output_path: info.output,
            thumbnail_path: info.thumbnail,
            thumbnail_url: query.bestThumbnail.url,
            title: info.title,
            track: info.track,
            url: info.query.url,
            video_path: info.video,
            playlist_author: query.author.name,
            video_id: query.id,
            playlist_title
        }, ev.sender, 'dl', config, eapp.getPath('userData'))
    }
})

electron.ipcMain.handle("dlvid", async (ev, link: string, audio_only = false, customRegExp: string[] = []) => {
    let onError = (err: string | Error) => {
        ev.sender.send("error", err)
        return err
    }
    if (!ytdl.validateURL(link)) {
        onError(`${link} is not a valid video`)
    }

    let agent = ytdl.createAgent(config.cookies)
    let query = (await ytdl.getBasicInfo(link, {agent, lang: 'en'})).videoDetails
    let thisId = id++
    if (!query) {
        return onError(`Error getting video info for ${link}`)
    }
    if (query.isLiveContent || query.age_restricted || query.isPrivate) {
        onError(`Video is currently unavalible (might be live) [${link}]`)
    }
    ev.sender.send("log", `Downloading ${query.title}`)
    if (audio_only) {
        fs.mkdirSync(path.resolve(config.output, "Music", "Various Artists", "Mixed"), { recursive: true })
        track = fs.existsSync(path.resolve(config.output, "Music", "Various Artists", "Mixed", "track.json")) ? JSON.parse(fs.readFileSync(path.resolve(config.output, "Music", "Various Artists", "Mixed", "track.json"), { encoding: 'utf-8' })).track : 0;
    } else {
        fs.mkdirSync(path.resolve(config.output, "TV Shows", "Mixed", "Season 00"), { recursive: true })
        track = fs.existsSync(path.resolve(config.output, "TV Shows", "Mixed", "track.json")) ? JSON.parse(fs.readFileSync(path.resolve(config.output, "TV Shows", "Mixed", "track.json"), { encoding: 'utf-8' })).track : 1;
    }
    let thisTrack = `${++track}`
    if (thisTrack.length < 2) {
        thisTrack = `0${thisTrack}`
    }
    let title = query.title.replace(/\.$/, '')
    try {
        for (let regexp of customRegExp) {
            let rex = new RegExp(regexp, "g")
            title = title.replace(rex, '')
        }
    } catch (err) {
        ev.sender.send("error", "Invalid Regular Expression")
        ev.sender.send("error", err)
        return
    }
    let info = {
        id: thisId,
        video: path.resolve(temp, `${thisId}_video.mp4`),
        audio: path.resolve(temp, `${thisId}_audio.mp4`),
        thumbnail: path.resolve(temp, `${thisId}_thumbnail.jpeg`),
        output: path.join('${dir}', `\${replace_title} ${title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '')}`),
        title,
        track,
        query
    }
    fs.writeFileSync(path.resolve(temp, "id.json"), JSON.stringify({ id }))
    if (!audio_only) {
        info.output = info.output.replace('${dir}', path.resolve(config.output, "TV Shows", "Mixed", "Season 00") + path.sep).replace("${replace_title} ", `S00e${thisTrack} -`)
        fs.writeFileSync(path.resolve(config.output, "TV Shows", "Mixed", "track.json"), JSON.stringify({ track }))
    } else {
        info.output = info.output.replace('${dir}', path.resolve(config.output, "Music", "Various Artists", "Mixed") + path.sep).replace("${replace_title} ", '')
        fs.writeFileSync(path.resolve(config.output, "Music", "Various Artists", "Mixed", "track.json"), JSON.stringify({ track }))
    }
    let alt_num = 0
    while (fs.existsSync(info.output + (alt_num > 0 ? `(alternate ${alt_num}).` : '.') + (audio_only ? config.audio_format : config.video_format))) {
        ++alt_num;
    }
    info.output = info.output + (alt_num > 0 ? `(alternate ${alt_num}).` : '.') + (audio_only ? config.audio_format : config.video_format)
    if (alt_num > 0) {
        info.title = `${info.title} (alternate ${alt_num})`
    }
    fs.writeFileSync(info.output, "Checker File")

    queue.add(audio_only, {
        audio_path: info.audio,
        author_name: query.author.name,
        from_pl: false,
        output_path: info.output,
        thumbnail_path: info.thumbnail,
        thumbnail_url: query.thumbnails.sort((a, b) => b.width - a.width || b.height - a.height)[0].url,
        title: info.title,
        track,
        url: link,
        video_path: info.video,
        video_id: query.videoId
    }, ev.sender, 'dl', config, eapp.getPath('userData'))
})

electron.ipcMain.handle("valid", async (ev, link: string) => {
    try {
        return (ytpl.validateID(link) ? "pl" : ytdl.validateURL(link)) || 
            ((link.includes('youtube.com/@') && await getIdFromHandle(link) != null) ? 'pl' : false)
    } catch (err) {
        return false
    }
})

electron.ipcMain.handle("choose_output", () => {
    let folder = electron.dialog.showOpenDialogSync({ properties: [ "createDirectory", "showHiddenFiles", "openDirectory" ], defaultPath: config.output, title: "Select An Output Folder" })
    config.output = folder != null ? folder[ 0 ] : config.output
    fs.writeFileSync(path.resolve(eapp.getPath("userData"), "config.json"), JSON.stringify(config, (_key, val) => (val == Infinity ? "infinity" : val), 4))
    return config.output
})

electron.ipcMain.handle("set_concurrency", (ev, dl: number | "infinity" = 5, proc: number | "infinity" = 5) => {
    //@ts-ignore
    if (dl.toString().toLowerCase() == "infinity") {
        config.concurrent_dl = Infinity
    } else if (typeof dl == "number") {
        //@ts-ignore
        config.concurrent_dl = parseInt(dl)
    } else if (isNaN(parseInt(dl))) {
        config.concurrent_dl = 5
    } else {
        config.concurrent_dl = parseInt(dl)
    }

    if (proc.toString().toLowerCase() == "infinity") {
        config.concurrent_process = Infinity
    } else if (typeof proc == "number") {
        //@ts-ignore
        config.concurrent_process = parseInt(proc)
    } else if (isNaN(parseInt(proc))) {
        config.concurrent_process = 5
    } else {
        config.concurrent_process = parseInt(proc)
    }

    //@ts-ignore

    fs.writeFileSync(path.resolve(eapp.getPath("userData"), "config.json"), JSON.stringify(config, (_key, val) => (val == Infinity ? "infinity" : val), 4))
    queue.max_count = config.concurrent_dl
    // dlqueue.max_count = config.concurent_process
    return "Values Set"
})

electron.ipcMain.handle('set_config', (ev, new_config: program_config) => {
    config = new_config
    fs.writeFileSync(path.resolve(eapp.getPath("userData"), "config.json"), JSON.stringify(config, null, 4))
})

electron.ipcMain.handle('config', ev => {
    return config
})

electron.ipcMain.handle("theme", (ev, theme?: "light" | "dark") => {
    if (theme) {
        config.theme = theme;
        fs.writeFileSync(path.resolve(eapp.getPath("userData"), "config.json"), JSON.stringify(config, (_key, val) => (val == Infinity ? "infinity" : val), 4))
    }
    return config.theme
})

let close = () => {
    server.close()
    eapp.quit()
    process.exit()
}

let createWin = (url: string, preloadFile = "", showOnCreate = true) => {
    let win = new electron.BrowserWindow({
        show: showOnCreate,
        autoHideMenuBar: true,
        webPreferences: {
            preload: preloadFile,
            contextIsolation: true,
            devTools: true,
            enableWebSQL: false,
            backgroundThrottling: true,
            nodeIntegration: false,
            nodeIntegrationInSubFrames: false,
            nodeIntegrationInWorker: false,
            offscreen: false,
        }
    })

    let open = (ev: electron.Event, url: string) => {
        if (ytdl.validateURL(url)) {
            electron.shell.openExternal(url, { activate: true })
        }
        ev.preventDefault()
    }

    win.webContents.on("will-navigate", open)
    win.webContents.session.setPermissionCheckHandler(() => {
        return false;
    })
    win.on("close", close)

    win.loadURL(url)
    return win
}

let sleep = async (ms: number) => {
    return new Promise(res => setTimeout(res, ms))
}

let port: number
let server = http.createServer(app)
let id = fs.existsSync(path.resolve(temp, "id.json")) ? JSON.parse(fs.readFileSync(path.resolve(temp, "id.json"), { encoding: 'utf-8' })).id : 0;
let track = 0

let startServer = (): number => {
    let _port = random.num(65535, 1024)
    try {
        server.listen(_port, "localhost")
        return _port;
    } catch (err) {
        if (err.code == "EADDRINUSE") {
            return startServer()
        } else {
            throw err
        }
    }
}

app.disable("x-powered-by")

if (!eapp.isPackaged) {
    /* eslint-disable @typescript-eslint/no-var-requires */
    let webpack: typeof import("webpack") = require("webpack")
    let wpdm: typeof import("webpack-dev-middleware") = require("webpack-dev-middleware")
    let wphm: typeof import("webpack-hot-middleware") = require("webpack-hot-middleware")
    let wpconfig: import("webpack").Configuration = require("../../webpack.config")
    /* eslint-enable @typescript-eslint/no-var-requires */
    let compiler = webpack(wpconfig)
    app.use(wpdm(compiler, {
        index: true,
        serverSideRender: true,
        writeToDisk: false
    }))
    app.use(wphm(compiler, {
        path: '/__hmr'
    }))
}

app.all("*", (req, res, next) => {
    res.removeHeader("x-powered-by")
    if (eapp.isPackaged) {
        return next()
    }
    let wpmw: import('webpack-dev-middleware').Context<import('http').IncomingMessage, import('http').ServerResponse & import("webpack-dev-middleware").ExtendedServerResponse> = res.locals.webpack.devMiddleware
    if (!wpmw.state) {
        return res.status(500).send("<p>Not done loading</p>")
    }
    wpmw.outputFileSystem.readdir(path.join(wpmw.stats.toJson().outputPath), (err) => {
        if (err) {
            return res.send(err)
        }

        if (req.path.includes("/outPath")) {
            //@ts-ignore
            return res.send(wpmw.outputFileSystem.readdirSync(wpmw.stats.toJson().outputPath))
        }

        wpmw.outputFileSystem.readFile(path.resolve(wpmw.stats.toJson().outputPath, path.normalize(`./${req.path}`)), (err2, data) => {
            if (!err2) {
                return res.send(data)
            }

            if (path.basename(req.path).match(/^([^./\\*"<>:|? ]+)(\.[^/\\*"<>:|?.]+)+$/)) {
                return res.status(404).end()
            }
            try {
                res.send(wpmw.outputFileSystem.readFileSync(path.join(wpmw.stats.toJson().outputPath, "index.html"), { encoding: 'utf-8' }))
            } catch {
                res.status(500).send("Internal Error")
            }
        })
    })

})

app.use(express.static(path.resolve(__dirname, "static"), { dotfiles: 'ignore', extensions: [ 'html' ] }))

let mainWin: electron.BrowserWindow
eapp.on("window-all-closed", close)

eapp.whenReady().then(() => {
    console.log("Started!")
    if (fs.existsSync(path.resolve(eapp.getPath("userData"), "config.json"))) {
        config = {...base_config, ...config, ...JSON.parse(fs.readFileSync(path.resolve(eapp.getPath("userData"), "config.json"), { encoding: 'utf-8' }), (_key, val) => (val == "infinity" ? Infinity : val))}
    }
    fs.writeFileSync(path.resolve(eapp.getPath("userData"), "config.json"), JSON.stringify(config, null, 4))
    queue.max_count = config.concurrent_dl
    // procqueue.max_count = config.concurent_process
    port = startServer()
    mainWin = createWin(`http://localhost:${port}`, path.resolve(__dirname, "preloads", "index.js"))
    autoUpdater.checkForUpdates().catch(() => {})
    let value = 0
    let type = false
    
})
