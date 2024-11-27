// TODO: Use ytdl.createAgent for priv + age restricted videos
/* eslint-disable @typescript-eslint/ban-ts-comment */
// process.env.ELECTRON_ENABLE_LOGGING='true'
import electron = require("electron")
import path = require("path")
// eslint-disable-next-line @typescript-eslint/no-var-requires
electron.app.isPackaged ? require(path.resolve(process.resourcesPath, ".pnp.cjs")).setup() : require("../.pnp.cjs").setup()
import fs = require("fs")
import Module = require("module")
let orequire = Module.prototype.require
//@ts-ignore
Module.prototype.require = function () {
    // eslint-disable-next-line prefer-rest-params
    if (arguments[0].startsWith("electron")) {
        return electron;
    }
    // eslint-disable-next-line prefer-rest-params
    return orequire.apply(this, arguments)
}

import _ffmpegPath = require("ffmpeg-static")
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

let temp = path.resolve(eapp.getPath("userData"), "./temp")
fs.mkdirSync(path.resolve(eapp.getPath("userData"), "ffmpeg"), { recursive: true })
let base_config: program_config = {
    concurrent_dl: os.cpus().length / 2,
    concurrent_process: os.cpus().length / 2,
    output: path.resolve(eapp.getPath("desktop"), "./media"),
    audio_format: 'mp3',
    video_format: 'mp4',
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

electron.ipcMain.handle("getpl", async (ev, link: string, reversePL = false, customRegExp: string[] = []) => {
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

    for (let query of pl.items) {
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
        items.push({ title, query })
    }

    if (reversePL) {
        items.reverse()
    }

    ev.sender.send("selector", { items, title: pl.title, url: pl.url })
})

// let dlqueue = new FuncQueue(config.concurent_dl, true)
// let procqueue = new FuncQueue(config.concurent_process, true)
let queue = new Queue(config.concurrent_dl, true)

/* interface pi {
    from_pl: boolean
    audio_path: string,
    thumbnail_path: string,
    video_path: string,
    output_path: string,
    title: string,
    author_name: string,
    url: string,
    track: number,
    thumbnail_url: string,
    // audio_url: string,
    // video_url: string
}

interface single_process_info extends pi{
    from_pl: false
}

interface pl_process_info extends pi {
    from_pl: true
    playlist_title: string
    playlist_author: string
}

type process_info = single_process_info | pl_process_info

let download_requested = async (audio_only: boolean, info: process_info, sender: electron.WebContents) => {
    
    let onError = (err: string | Error) => {
        sender.send("error", err)
        return err
    }
    let ytdl_download = (video = false) => new Promise<void>( r => {
        let file = fs.createWriteStream(video ? info.video_path : info.audio_path)
        let stream = ytdl(info.url, { liveBuffer: 25000, highWaterMark: 1024 * 1024 * 64, quality: video ? 'highestvideo' : "highestaudio" })
        stream.on("progress", (length, downloaded, total) => {
            console.log(downloaded, total)
            sender.send('progress', info.title, 'dl', downloaded, total, video ? 'video' : 'audio')
        })
        stream.pipe(file, { end: true })
        file.on('finish', () => {
            file.close()
            r()
        })
    })
    let thumbnail = new Promise<void>(r => {
        https.get(info.thumbnail_url, res => {
            let stream = fs.createWriteStream(info.thumbnail_path, { autoClose: true })
            res.pipe(stream)
            stream.on('finish', () => {
                stream.close()
                r()
            })
            res.on('error', () => {
                stream.close()
                r();
            })
        })
    })
    let audio_promise = ytdl_download()
    let video_promise: Promise<any | void>
    if (!audio_only) {
        video_promise = ytdl_download(true)
    }

    try {
        await Promise.allSettled([
            thumbnail,
            audio_promise,
            video_promise
        ])
    } catch {
        onError(`Error Downloading: ${info.title}`)
        return
    }

    procqueue.add(ffmpeg_process, audio_only, info, sender)
}

let addition_options = (audio: boolean) => {
    if (!audio) {
        switch (config.video_format) {
            case "av1": {
                return [
                    '-c:a', 'opus',
                    '-compression_level', '10', // Slowest encode - highest quality
                    '-application', 'audio',
                    '-f', 'av1',
                    '-c:v', 'libaom-av1',
                    '-crf', '0'
                ]
            }
            case "webp": {
                return [
                    '-c:a', 'opus',
                    '-compression_level', '10', // Slowest encode - highest quality
                    '-application', 'audio',
                    '-f', 'webp',
                    '-c:v', 'libwebp',
                    '-lossless'
                ]
            }
            case "mp4": {
                return [
                    '-c:a', 'opus',
                    '-compression_level', '10', // Slowest encode - highest quality
                    '-application', 'audio',
                    '-f', 'mp4',
                    '-c:v', 'libx265'
                ]
            }
            case "mkv": {
                return [
                    '-c:a', 'opus',
                    '-compression_level', '10', // Slowest encode - highest quality
                    '-application', 'audio',
                    '-f', 'matroska',
                    '-c:v', 'libx265'
                ]
            }
            case "flv": {
                return [
                    '-c:a', 'opus',
                    '-compression_level', '10', // Slowest encode - highest quality
                    '-application', 'audio',
                    '-f', 'flv',
                    '-c:v', 'libx265'
                ]
            }
        }
    }
    switch (config.audio_format) {
        case "aac": {
            return [
                '-f', 'aac',
                '-c:a', 'aac'
            ]
        }
        case "flac": {
            return [
                '-f', 'flac'
            ]
        }
        case "mp3": {
            return [
                '-f', 'mp3',
                '-compression_level', '0', // Slowest encode - highest quality
                '-metadata:s:v', 'title=Album Cover'
            ]
        }
        case "opus": {
            return [
                '-c:a', 'opus',
                '-compression_level', '10', // Slowest encode - highest quality
                '-application', 'audio',
                '-f', 'opus'
            ]
        }
        case "pcm_f32le": {
            return [
                '-f', 'f32le'
            ]
        }
        case "pcm_f16le": {
            return [
                '-f', 'f16le'
            ]
        }
    }
    return []
}

let ffmpeg_process = async (audio_only: boolean, info: process_info, sender: electron.WebContents) => {

    let onError = (err: Error | string) => {
        if (err) {
            sender.send("error", `Error Downloading: ${info.title}`)
            return `Error Downloading: ${info.title}`
        }
    }
    let date = dayjs()
    fs.appendFileSync(path.resolve(eapp.getPath("userData"), "ffmpeg.log"), `${info.title} started at ${date.format("DD/MM/YYYY HH:mm:ss")}\n`)
    let ffmpegLog = fs.createWriteStream(path.resolve(eapp.getPath("userData"), "ffmpeg", `${info.title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '')}.log`), { autoClose: true, flags: 'a+' })
    let ffmpeg = child_process.spawn(ffmpegPath, [
        '-stats',
        '-progress', 'pipe:3',
        '-i', info.audio_path,
        '-i', info.thumbnail_path,
    ...(audio_only ? [] : [
        '-i', info.video_path,
    ]),
        '-map', '0:a',
        '-map', '1:v',
        '-c:v:0', 'mjpeg',
        '-disposition:v:0', 'attached_pic',
    ...(audio_only ? [
    ] : [
        '-map', '2:v',
        '-c:v:1', 'copy',
        '-c:a:0', 'aac',
    ]),
        ...addition_options(audio_only),
    ...(info.from_pl ? [
        '-metadata', `album=${info.playlist_title}`,
        '-metadata', `album_artist=${info.playlist_author}`,
    ] : [
        '-metadata', `album=Mixed`,
        '-metadata', `album_artist=Various Artists`,
    ]),
        '-metadata', `artist=${info.author_name || "No Artist"}`,
        '-metadata', `author=${info.author_name || "No Author"}`,
        '-metadata', `composer=${info.author_name || "No Composer"}`,
        '-metadata', `publisher=${info.author_name || "No Publisher"}`,
        '-metadata', `performer=${info.author_name || "No Performer"}`,
        '-metadata', `comment="${info.url}"`,
        '-metadata', `genre=YouTube Video`,
        '-metadata', `title=${info.title}`,
        '-metadata', `track=${info.track}`,
        '-metadata', `disc=1`,
        "-y", info.audio_path
    ], {
        shell: false,
        detached: false,
        windowsHide: true,
        killSignal: "SIGKILL",
        stdio: ['inherit', 'pipe', 'pipe', 'pipe']
    })
    ffmpeg.on("error", (err) => { ffmpegLog.write(onError(err)) })
    ffmpeg.stderr.pipe(ffmpegLog, { end: true })
    ffmpeg.stdout.pipe(ffmpegLog, { end: true })
    // ffmpeg.stderr.pipe(process.stderr, { end: true })
    // ffmpeg.stdout.pipe(process.stdout, { end: true })
    let ffprogress = readline.createInterface(ffmpeg.stdio[3] as import('stream').Readable)
    let ffstderr = readline.createInterface(ffmpeg.stderr)
    let total = Infinity
    ffprogress.on('line', (data) => {
        if (data.startsWith('out_time_ms')) {
            let value = parseInt(data.replace("out_time_ms=", '')) / 1000
            if (isNaN(value) || value < 0) {
                return;
            }
            sender.send('progress', info.title, 'process', value, total)
        }
        if (data == "progress=end") {
            sender.send('progress', info.title, 'process', 1, 1)
        }
    })
    ffstderr.on('line', (data) => {
        if (data.includes("duration")) {
            let cliped = data.trim().toLowerCase().replace(/duration: ?([0-9:.]+).* ?/i, '$1')
            let split = cliped.split(":")
            // In ms
            let new_total = (
                (parseFloat(split[0]) * 60 * 60) +
                (parseFloat(split[1]) * 60) +
                (parseFloat(split[2]))
            ) * 1000
            if (total < new_total) {
                total = new_total
            }
        }
    })
    await new Promise<void>(r => {
        ffmpeg.on("exit", () => {
            ffmpegLog.close()
            ffprogress.close()
            ffstderr.close()
            if (!audio_only) {
                fs.rmSync(info.video_path)
            }
            fs.rmSync(info.thumbnail_path)
            fs.rmSync(info.audio_path)
            sender.send("log", `${info.title} Done`)
            r()
        })
    })
} */

electron.ipcMain.handle("dlpl", (ev, pl_info: infoPL[], audio_only: boolean, title: string) => {
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
        let thisTrack = `${i + 1}`
        if (!thisTrack.startsWith("0")) {
            thisTrack = `0${thisTrack}`
        }
        let info: infoPL = {
            id: thisId,
            video: path.resolve(temp, `${thisId}_video.mp4`),
            audio: path.resolve(temp, `${thisId}_audio.mp4`),
            thumbnail: path.resolve(temp, `${thisId}_thumbnail.jpeg`),
            output: path.join('${dir}', `\${replace_title}${pl_info[ i ].title.replaceAll("w/", 'with').replace(/[<>:"/\\|?*]/g, '').replace(/\.$/, '').replaceAll(/ +/g, ' ')}`),
            title: pl_info[ i ].title.replace(/\.$/, '').replaceAll(/ +/g, ' '),
            track: i + 1,
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

        /* dlqueue.add(download_requested, data.audioOnly, {
            audio_path: info.audio,
            author_name: query.author.name,
            from_pl: true,
            output_path: info.output,
            thumbnail_path: info.thumbnail,
            thumbnail_url: query.bestThumbnail.url,
            title: info.title,
            track,
            url: info.query.url,
            video_path: info.video,
            playlist_author: query.author.name,
            playlist_title
        }, ev.sender) */
        queue.add(audio_only, {
            audio_path: info.audio,
            author_name: query.author.name,
            from_pl: true,
            output_path: info.output,
            thumbnail_path: info.thumbnail,
            thumbnail_url: query.bestThumbnail.url,
            title: info.title,
            track,
            url: info.query.url,
            video_path: info.video,
            playlist_author: query.author.name,
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
    let query = (await ytdl.getInfo(link, {agent, lang: 'en'})).videoDetails
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
    if (!thisTrack.startsWith("0")) {
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

    /* dlqueue.add(download_requested, audio_only, {
        audio_path: info.audio,
        author_name: query.author.name,
        from_pl: false,
        output_path: info.output,
        thumbnail_path: info.thumbnail,
        thumbnail_url: query.thumbnail.thumbnails.sort((a, b) => b.width - a.width || b.height - a.height)[0].url,
        title: info.title,
        track,
        url: link,
        video_path: info.video
    }, ev.sender) */
    queue.add(audio_only, {
        audio_path: info.audio,
        author_name: query.author.name,
        from_pl: false,
        output_path: info.output,
        thumbnail_path: info.thumbnail,
        thumbnail_url: query.thumbnail.thumbnails.sort((a, b) => b.width - a.width || b.height - a.height)[0].url,
        title: info.title,
        track,
        url: link,
        video_path: info.video
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
    return "Values Set\n"
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

console.log(process.versions)

let createWin = (url: string, preloadFile = "", showOnCreate = true) => {
    let win = new electron.BrowserWindow({
        show: showOnCreate,
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
    // if (_port < 1024) {
    //     return startServer()
    // } else {
    // }
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
    let wpconfig: import("webpack").Configuration = require("../webpack.config")
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
    autoUpdater.checkForUpdates()
    let value = 0
    let type = false
    // setInterval(() => {
    //     if (value == 100) {
    //         type = !type
    //         value = 0
    //         mainWin.webContents.send('progress', 'Hello, World! A programmer\'s first step', 'process', 0, 100, 'audio')
    //     }
    //     if (!type) {
    //         mainWin.webContents.send('progress', 'Hello, World! A programmer\'s first step', 'dl', value, 100, 'video')
    //     }
    //     mainWin.webContents.send('progress', 'Hello, World! A programmer\'s first step', type ? 'process' : 'dl', value, 100, 'audio')
    //     value++
    // }, 50)
})/* .then(mainVid) */
