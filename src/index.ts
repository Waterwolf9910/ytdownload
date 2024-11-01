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
import cp = require("child_process")
import http = require("http")
import https = require("https")
import ytdl = require("@distube/ytdl-core")
import ytpl = require("ytpl")
import express = require("express")
import dayjs = require("dayjs")
import _random = require("wolf_utils/random.js")
import events = require("events")
import os = require('os')
import updater = require("electron-updater")
import readline = require("readline")

let eapp = electron.app
electron.nativeTheme.themeSource = "dark"
//@ts-ignore
let ffmpegPath: string = _ffmpegPath
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
let config: {
    output: string,
    concurent_dl: number,
    concurent_process: number,
    theme: "light" | "dark"
} = {
    concurent_dl: os.cpus().length,
    concurent_process: os.cpus().length,
    output: path.resolve(eapp.getPath("desktop"), "./media"),
    theme: "dark"
}
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
    let items: { title: string, query: ytpl.Item }[] = []
    let pl: ytpl.Result
    try {
            pl = await ytpl(link, { limit: Infinity })
    } catch {
        try {
            pl = await ytpl(await getIdFromHandle(link), {limit: Infinity})
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
                let rex = new RegExp(regexp)
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

let downloading = 0
let processing = 0
let dlqueue: number[] = []
let procqueue: number[] = []

class NextEvents extends events {
    #pwlck = 0

    setLock(): void {
        if (!electron.powerSaveBlocker.isStarted(this.#pwlck)) {
            this.#pwlck = electron.powerSaveBlocker.start("prevent-app-suspension")
        }
    }

    once(eventName: string, listener: (...args: unknown[]) => void): this {
        return super.once(eventName, listener)
    }

    emit(eventName: string | symbol, ...args: unknown[]): boolean {
        if (processing < 2) {
            electron.powerSaveBlocker.stop(this.#pwlck)
        }
        return super.emit(eventName, ...args)
    }
}

let nextevent = new NextEvents()

nextevent.on("donedl", () => {
    if (dlqueue.length > 0) {
        nextevent.emit(`startdl_${dlqueue[ 0 ]}`)
        dlqueue.shift()
    }

})

nextevent.on("doneproc", () => {
    if (procqueue.length > 0) {
        nextevent.emit(`startproc_${procqueue[ 0 ]}`)
        procqueue.shift()
    }
})

electron.ipcMain.handle("dlpl", (ev, data: { info: infoPL[], audioOnly: boolean, title: string }) => {
    nextevent.setLock()
    console.log("Starting pl dl")
    mainWin.webContents.send("log", "Downloading Playlist")
    if (data.audioOnly) {
        data.title = data.title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '').replace(/\.$/, '').replaceAll(/ +/g, ' ')
        fs.mkdirSync(path.resolve(config.output, "Music", "Various Artists", data.title), { recursive: true })
    } else {
        data.title = data.title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '').replace(/\.$/, '').replaceAll(/ +/g, ' ')
        fs.mkdirSync(path.resolve(config.output, "TV Shows", data.title, "Season 00"), { recursive: true })
    }
    for (let i = 0; i < data.info.length; i++) {
        let thisId = id++
        let query = data.info[ i ].query
        let thisTrack = `${i + 1}`
        if (!thisTrack.startsWith("0")) {
            thisTrack = `0${thisTrack}`
        }
        let info: infoPL = {
            id: thisId,
            video: path.resolve(temp, `${thisId}_video.mp4`),
            audio: path.resolve(temp, `${thisId}_audio.mp4`),
            thumbnail: path.resolve(temp, `${thisId}_thumbnail.jpeg`),
            output: path.join('${dir}', `\${replace_title}${data.info[ i ].title.replaceAll("w/", 'with').replace(/[<>:"/\\|?*]/g, '').replace(/\.$/, '').replaceAll(/ +/g, ' ')}.${data.audioOnly ? "mp3" : "mp4"}`),
            title: data.info[ i ].title.replace(/\.$/, '').replaceAll(/ +/g, ' '),
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
        if (!data.audioOnly) {
            info.output = info.output.replace('${dir}', path.resolve(config.output, "TV Shows", data.title, "Season 00") ).replace("${replace_title}", `S00e${thisTrack} - `)
        } else {
            info.output = info.output.replace('${dir}', path.resolve(config.output, "Music", "Various Artists", data.title)).replace("${replace_title}", ''/* `${thisTrack} -` */)
            fs.writeFileSync(path.resolve(config.output, "Music", "Various Artists", data.title, "track.json"), JSON.stringify({ track }))
        }
        let alt = 0;
        let outputRaw = info.output.replace(".mp3", " ").replace(".mp4", " ")
        let titleRaw = info.title
        while (fs.existsSync(info.output)) {
            ++alt;
            info.output = data.audioOnly ? outputRaw + ` (alternate ${alt}).mp3` : outputRaw + ` (alternate ${alt}).mp4`
            info.title = titleRaw + ` (alternate ${alt})`
        }
        fs.writeFileSync(info.output, "Checker File")

        nextevent.once(`startdl_${info.id}`, async () => {
            downloading++
            let vidDone = false
            let audioDone = false
            let videoFile: fs.WriteStream
            let videoStream: import("stream").Readable
            await new Promise<void>(r => {
                https.get(info.query.bestThumbnail.url, (res) => {
                    let stream = fs.createWriteStream(path.resolve(info.thumbnail), { autoClose: true })
                    res.pipe(stream)
                    stream.on("finish", () => {
                        r()
                        stream.close()
                    })
                    res.on("error", () => {
                        r()
                    })
                })
            })
            try {
                if (!data.audioOnly) {
                    videoFile = fs.createWriteStream(info.video, { autoClose: true })
                    videoStream = ytdl(info.query.url, { liveBuffer: 25000, highWaterMark: 1024 * 1024 * 64, quality: "highestvideo" })
                }
                let audioFile = fs.createWriteStream(info.audio, { autoClose: true })
                let audioStream = ytdl(info.query.url, { liveBuffer: 25000, highWaterMark: 1024 * 1024 * 64, quality: "highestaudio" })
                let finsh = async () => {
                    nextevent.emit("donedl")
                    downloading--
                    processing++
                    mainWin.webContents.send("log", `Processing ${info.title}`)
                    try {
                        let date = dayjs()
                        fs.appendFileSync(path.resolve(eapp.getPath("userData"), "ffmpeg.log"), `${info.title} started at ${date.format("DD/MM/YYYY HH:mm:ss")}\n`)
                        let ffmpegLog = fs.createWriteStream(path.resolve(eapp.getPath("userData"), "ffmpeg", `${info.title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '')}.log`), { autoClose: true, flags: 'a+' })
                        let ffmpeg: cp.ChildProcess
                        if (data.audioOnly) {
                            ffmpeg = cp.spawn(ffmpegPath, [
                                '-stats',
                                '-progress', 'pipe:3',
                                '-i', info.audio,
                                '-i', info.thumbnail,
                                '-map', '0:a',
                                '-c:a', 'mp3',
                                '-map', '1:v',
                                '-c:v:0', 'mjpeg',
                                '-disposition:v:0', 'attached_pic',
                                '-metadata', `album=${data.title}`,
                                '-metadata', `album_artist=Various Artists`,
                                '-metadata', `artist=${info.query.author.name || "No Artist"}`,
                                '-metadata', `author=${info.query.author.name || "No Author"}`,
                                '-metadata', `composer=${info.query.author.name || "No Composer"}`,
                                '-metadata', `publisher=${info.query.author.name || "No Publisher"}`,
                                '-metadata', `performer=${info.query.author.name || "No Performer"}`,
                                '-metadata', `disc=1`,
                                '-metadata', `genre=YouTube Video`,
                                '-metadata', `comment="${info.query.url}"`,
                                '-metadata', `title=${info.title}`,
                                '-metadata', `track=${info.track}`,
                                "-y",
                                `${info.output}`
                            ], {
                                shell: false,
                                stdio: ['inherit', 'pipe', 'pipe', 'pipe']
                            })
                        } else {
                            ffmpeg = cp.spawn(ffmpegPath, [
                                '-stats',
                                '-progress', 'pipe:3',
                                '-i', info.video,
                                '-i', info.audio,
                                '-i', info.thumbnail,
                                '-map', '0:v',
                                '-c:v:0', 'copy',
                                '-map', '1:a',
                                '-c:a:0', 'aac',
                                '-map', '2:v',
                                '-c:v:1', 'mjpeg',
                                '-disposition:v:1', 'attached_pic',
                                '-metadata', `album=${data.title}`,
                                '-metadata', `album_artist=${data.title}`,
                                '-metadata', `artist=${info.query.author.name || "No Artist"}`,
                                '-metadata', `author=${info.query.author.name || "No Author"}`,
                                '-metadata', `composer=${info.query.author.name || "No Composer"}`,
                                '-metadata', `publisher=${info.query.author.name || "No Publisher"}`,
                                '-metadata', `performer=${info.query.author.name || "No Performer"}`,
                                '-metadata', `disc=1`,
                                '-metadata', `title=${info.title.replaceAll('"', '')}`,
                                '-metadata', `track=${info.track}`,
                                "-y",
                                `${info.output}`
                            ], {
                                shell: false,
                                stdio: ['inherit', 'pipe', 'pipe', 'pipe']
                            })
                        }
                        let ffprogress = readline.createInterface(ffmpeg.stdio[3] as import('stream').Readable)
                        let ffstderr = readline.createInterface(ffmpeg.stderr)
                        let total = Infinity
                        ffprogress.on('line', (data) => {
                            if (data.startsWith('out_time_ms')) {
                                let value = parseInt(data.replace("out_time_ms=", '')) / 1000
                                if (isNaN(value) || value < 0) {
                                    return;
                                }
                                ev.sender.send('progress', info.title, 'process', value, total)
                            }
                        })
                        ffstderr.on('line', (data) => {
                            if (data.includes("duration")) {
                                let cliped = data.trim().toLowerCase().replace(/duration: ?([0-9:.]+).*/i, '$1')
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
                        ffmpeg.on("error", () => { ffmpegLog.write(onError) })
                        ffmpeg.stderr.pipe(ffmpegLog, { end: true })
                        ffmpeg.stdout.pipe(ffmpegLog, { end: true })
                        ffmpeg.stdout.pipe(process.stdout, { end: true })
                        ffmpeg.on("exit", () => {
                            ffmpegLog.close()
                            ffprogress.close()
                            ffstderr.close()
                            if (!data.audioOnly) {
                                fs.rmSync(info.video)
                            }
                            fs.rmSync(info.thumbnail)
                            fs.rmSync(info.audio)
                            mainWin.webContents.send("log", `${info.title} Done`)
                            nextevent.emit("doneproc")
                            processing--
                        })
                    } catch {
                        mainWin.webContents.send("error", `Error Downloading: ${info.title}`)
                        return `Error Downloading: ${info.title}`
                    }
                }
                let checkAndCloseAudio = () => {
                    if (vidDone || data.audioOnly) {
                        nextevent.once(`startproc_${info.id}`, finsh)
                        if (processing < config.concurent_process) {
                            nextevent.emit(`startproc_${info.id}`)
                        } else {
                            procqueue.push(info.id)
                        }
                    } else if (!audioDone) {
                        audioFile.close()
                        audioDone = true;
                    }
                }
                let checkAndCloseVideo = () => {
                    if (audioDone) {
                        nextevent.once(`startproc_${info.id}`, finsh)
                        if (processing < config.concurent_process) {
                            nextevent.emit(`startproc_${info.id}`)
                        } else {
                            procqueue.push(info.id)
                        }
                    } else if (!vidDone) {
                        videoFile.close()
                        vidDone = true;
                    }
                }
                audioFile.once("finish", checkAndCloseAudio)
                audioStream.pipe(audioFile, { end: true })
                if (!data.audioOnly) {
                    videoFile.once("finish", checkAndCloseVideo)
                    videoStream.pipe(videoFile, { end: true })
                }
            } catch (err) {
                onError(err)
            }
        })
        if (downloading < config.concurent_dl) {
            nextevent.emit(`startdl_${info.id}`)
        } else {
            dlqueue.push(info.id)
        }
    }
})

electron.ipcMain.handle("dlvid", async (ev, link: string, audioOnly = false, customRegExp: string[] = []) => {
    if (ytdl.validateURL(link)) {
        let query = (await ytdl.getInfo(link)).videoDetails
        let thisId = id++
        if (!query) {
            return `Error getting video info for ${link}`
        }
        if (query.isLiveContent || query.age_restricted || query.isPrivate) {
            ev.sender.send("error", "Video is currently unavalible (might be live)")
            return "Video is currently unavalible (might be live)"
        }
        ev.sender.send("log", `Downloading ${query.title}`)
        if (audioOnly) {
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
            output: path.join('${dir}', `\${replace_title} ${title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '')}.${audioOnly ? "mp3" : "mp4"}`),
            title,
            track,
            query
        }
        let onError = (err) => {
            if (err) {
                ev.sender.send("error", `Error Downloading: ${info.title}`)
                return `Error Downloading: ${info.title}`
            }
        }
        fs.writeFileSync(path.resolve(temp, "id.json"), JSON.stringify({ id }))
        if (!audioOnly) {
            info.output = info.output.replace('${dir}', path.resolve(config.output, "TV Shows", "Mixed", "Season 00") + path.sep).replace("${replace_title} ", `S00e${thisTrack} -`)
            fs.writeFileSync(path.resolve(config.output, "TV Shows", "Mixed", "track.json"), JSON.stringify({ track }))
        } else {
            info.output = info.output.replace('${dir}', path.resolve(config.output, "Music", "Various Artists", "Mixed") + path.sep).replace("${replace_title} ", '' /* `${thisTrack} -` */)
            fs.writeFileSync(path.resolve(config.output, "Music", "Various Artists", "Mixed", "track.json"), JSON.stringify({ track }))
        }
        if (fs.existsSync(info.output)) {
            info.output = info.output.replace(".mp3", " (alternate).mp3").replace(".mp4", " (alternate).mp4")
            info.title += " (alternate)"
        } else {
            fs.writeFileSync(info.output, "Checker File")
        }
        nextevent.once(`startdl_${info.id}`, async () => {
            downloading++
            let vidDone = false
            let audioDone = false
            let videoFile: fs.WriteStream
            let videoStream: import("stream").Readable
            await new Promise<void>(r => {
                https.get(info.query.thumbnails[0].url, (res) => {
                    let stream = fs.createWriteStream(path.resolve(info.thumbnail), { autoClose: true })
                    res.pipe(stream)
                    stream.on("finish", () => {
                        r()
                        stream.close()
                    })
                    res.on("error", () => {
                        r()
                    })
                })
            })
            try {
                if (!audioOnly) {
                    videoFile = fs.createWriteStream(info.video, { autoClose: true })
                    videoStream = ytdl(link, { liveBuffer: 25000, highWaterMark: 1024 * 1024 * 64, quality: "highestvideo" })
                    videoStream.on("progress", (length, downloaded, total) => {
                        console.log(downloaded, total)
                        ev.sender.send('progress', info.title, 'dl', downloaded, total, 'video')
                    })
                }
                let audioFile = fs.createWriteStream(info.audio, { autoClose: true })
                let audioStream = ytdl(link, { liveBuffer: 25000, highWaterMark: 1024 * 1024 * 64, quality: "highestaudio" })
                audioStream.on("progress", (length, downloaded, total) => {
                        console.log(downloaded, total)
                    ev.sender.send('progress', info.title, 'dl', downloaded, total, 'audio')
                })
                let finsh = () => {
                    nextevent.emit("donedl")
                    downloading--
                    processing++
                    ev.sender.send("log", `Processing ${info.title}`)
                    try {
                        let date = dayjs()
                        fs.appendFileSync(path.resolve(eapp.getPath("userData"), "ffmpeg.log"), `${info.title} started at ${date.format("DD/MM/YYYY HH:mm:ss")}\n`)
                        let ffmpegLog = fs.createWriteStream(path.resolve(eapp.getPath("userData"), "ffmpeg", `${info.title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '')}.log`), { autoClose: true, flags: 'a+' })
                        let ffmpeg: cp.ChildProcess
                        if (audioOnly) {
                            ffmpeg = cp.spawn(ffmpegPath, [
                                '-stats',
                                '-progress', 'pipe:3',
                                '-i', info.audio,
                                '-i', info.thumbnail,
                                '-map', '0:a',
                                '-c:a', 'mp3',
                                '-map', '1:v',
                                '-c:v:0', 'mjpeg',
                                '-disposition:v:0', 'attached_pic',
                                '-metadata', `title=${title}`,
                                '-metadata', `artist=${info.query.author.name || "No Artist"}`,
                                '-metadata', `author=${info.query.author.name || "No Author"}`,
                                '-metadata', `composer=${info.query.author.name || "No Composer"}`,
                                '-metadata', `publisher=${info.query.author.name || "No Publisher"}`,
                                '-metadata', `performer=${info.query.author.name || "No Performer"}`,
                                '-metadata', `genre=YouTube Video`,
                                '-metadata', `comment="${link}"`,
                                '-metadata', `album_artist=Various Artists`,
                                '-metadata', `track=${info.track}`,
                                '-metadata', `disc=1`,
                                '-metadata', `album=Mixed`,
                                "-y",
                                info.
                                output
                            ], {
                                shell: false,
                                stdio: ['inherit', 'pipe', 'pipe', 'pipe']
                            })
                        } else {
                            ffmpeg = cp.spawn(ffmpegPath, [
                                '-stats',
                                '-progress', 'pipe:3',
                                '-i', info.video,
                                '-i', info.audio,
                                '-i', info.thumbnail,
                                '-map', '0:v',
                                '-c:v:0', 'copy',
                                '-map', '1:a',
                                '-c:a:0', 'aac',
                                '-map', '2:v',
                                '-c:v:1', 'mjpeg',
                                '-disposition:v:1', 'attached_pic',
                                '-metadata', `title=${title}`,
                                '-metadata', `artist=${info.query.author.name || "No Artist"}`,
                                '-metadata', `author=${info.query.author.name || "No Author"}`,
                                '-metadata', `composer=${info.query.author.name || "No Composer"}`,
                                '-metadata', `publisher=${info.query.author.name || "No Publisher"}`,
                                '-metadata', `performer=${info.query.author.name || "No Performer"}`,
                                '-metadata', `album=Mixed`,
                                '-metadata', `track=${info.track}`,
                                '-metadata', `disc=1`,
                                "-y",
                                info.output
                            ], {
                                shell: false,
                                stdio: ['inherit', 'pipe', 'pipe', 'pipe']
                            })
                        }
                        ffmpeg.on("error", () => { ffmpegLog.write(onError) })
                        ffmpeg.stderr.pipe(ffmpegLog, { end: true })
                        ffmpeg.stderr.pipe(process.stderr, { end: true })
                        ffmpeg.stdout.pipe(ffmpegLog, { end: true })
                        ffmpeg.stdout.pipe(process.stdout, { end: true })
                        let ffprogress = readline.createInterface(ffmpeg.stdio[3] as import('stream').Readable)
                        let ffstderr = readline.createInterface(ffmpeg.stderr)
                        let total = Infinity
                        ffprogress.on('line', (data) => {
                            if (data.startsWith('out_time_ms')) {
                                let value = parseInt(data.replace("out_time_ms=", '')) / 1000
                                if (isNaN(value) || value < 0) {
                                    return;
                                }
                                ev.sender.send('progress', info.title, 'process', value, total)
                            }
                            if (data == "progress=end") {
                                ev.sender.send('progress', info.title, 'process', 1, 1)
                            }
                        })
                        ffstderr.on('line', (data) => {
                            if (data.includes("duration")) {
                                let cliped = data.trim().toLowerCase().replace(/duration: ?([0-9:.]+).*/i, '$1')
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
                        ffmpeg.on("exit", () => {
                            ffmpegLog.close()
                            ffprogress.close()
                            ffstderr.close()
                            if (!audioOnly) {
                                fs.rmSync(info.video)
                            }
                            fs.rmSync(info.thumbnail)
                            fs.rmSync(info.audio)
                            ev.sender.send("log", `${info.title} Done`)
                            nextevent.emit("doneproc")
                            processing--
                        })
                    } catch {
                        ev.sender.send("error", `Error Downloading: ${info.title}`)
                        return `Error Downloading: ${info.title}`
                    }
                }
                let checkAndCloseAudio = () => {
                    if (vidDone || audioOnly) {
                        nextevent.once(`startproc_${info.id}`, finsh)
                        if (processing < config.concurent_process) {
                            nextevent.emit(`startproc_${info.id}`)
                        } else {
                            procqueue.push(info.id)
                        }
                    } else if (!audioDone) {
                        audioFile.close()
                        audioDone = true;
                    }
                }
                let checkAndCloseVideo = () => {
                    if (audioDone) {
                        nextevent.once(`startproc_${info.id}`, finsh)
                        if (processing < config.concurent_process) {
                            nextevent.emit(`startproc_${info.id}`)
                        } else {
                            procqueue.push(info.id)
                        }
                    } else if (!vidDone) {
                        videoFile.close()
                        vidDone = true;
                    }
                }
                audioFile.on("finish", checkAndCloseAudio)
                audioStream.pipe(audioFile, { end: true })
                if (!audioOnly) {
                    videoFile.on("finish", checkAndCloseVideo)
                    videoStream.pipe(videoFile, { end: true })
                }
            } catch (err) {
                onError(err)
            }
        })
        if (downloading < config.concurent_dl) {
            nextevent.emit(`startdl_${info.id}`)
        } else {
            dlqueue.push(info.id)
        }
    } else {
        ev.sender.send("error", `${link} is not a valid video`)
        return `${link} is not a valid video`
    }

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
})

electron.ipcMain.handle("set_concurrency", (ev, dl: number | "infinity" = 5, proc: number | "infinity" = 5) => {
    //@ts-ignore
    if (dl.toString().toLowerCase() == "infinity") {
        config.concurent_dl = Infinity
    } else if (typeof dl == "number") {
        //@ts-ignore
        config.concurent_dl = parseInt(dl)
    } else if (isNaN(parseInt(dl))) {
        config.concurent_dl = 5
    } else {
        config.concurent_dl = parseInt(dl)
    }

    if (proc.toString().toLowerCase() == "infinity") {
        config.concurent_process = Infinity
    } else if (typeof proc == "number") {
        //@ts-ignore
        config.concurent_process = parseInt(proc)
    } else if (isNaN(parseInt(proc))) {
        config.concurent_process = 5
    } else {
        config.concurent_process = parseInt(proc)
    }

    //@ts-ignore

    fs.writeFileSync(path.resolve(eapp.getPath("userData"), "config.json"), JSON.stringify(config, (_key, val) => (val == Infinity ? "infinity" : val), 4))
    nextevent.setMaxListeners(config.concurent_process + config.concurent_dl + 7)
    return "Values Set\n"
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
        config = {...config, ...JSON.parse(fs.readFileSync(path.resolve(eapp.getPath("userData"), "config.json"), { encoding: 'utf-8' }), (_key, val) => (val == "infinity" ? Infinity : val))}
    } else {
        fs.writeFileSync(path.resolve(eapp.getPath("userData"), "config.json"), JSON.stringify(config, null, 4))
    }
    port = startServer()
    mainWin = createWin(`http://localhost:${port}`, path.resolve(__dirname, "preloads", "index.js"))
    autoUpdater.checkForUpdates()
    nextevent.setMaxListeners(config.concurent_process + config.concurent_dl + 7)
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
