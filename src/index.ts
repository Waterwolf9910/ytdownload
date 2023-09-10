/* eslint-disable @typescript-eslint/ban-ts-comment */
// process.env.ELECTRON_ENABLE_LOGGING='true'
import electron = require("electron")
// eslint-disable-next-line @typescript-eslint/no-var-requires
// require("../.pnp.cjs").setup()
import path = require("path")
// eslint-disable-next-line @typescript-eslint/no-var-requires
electron.app.isPackaged ? require(path.resolve(process.resourcesPath, ".pnp.cjs")).setup() : require("../.pnp.cjs").setup()
import fs = require("fs")
import Module = require("module")
let orequire = Module.prototype.require
//@ts-ignore
Module.prototype.require = function () {
    // eslint-disable-next-line prefer-rest-params
    if (arguments[0] == "electron") {
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
// import url = require("url")
import dayjs = require("dayjs")
import _random = require("./libs/random")
import events = require("events")
import updater = require("electron-updater")
// import _eaa = require("electron-updater/out/ElectronAppAdapter")
// eslint-disable-next-line @typescript-eslint/no-var-requires
// let build_config: import("electron-builder").Configuration = require("./config.js")

let eapp = electron.app
//@ts-ignore
let ffmpegPath: string = _ffmpegPath
let random = new _random(4, 9)
let app = express()

let autoUpdater: typeof updater.autoUpdater = updater.autoUpdater
// let eaa = new _eaa.ElectronAppAdapter(eapp)

/* if (process.platform == "win32") {
    
    //@ts-ignore
    autoUpdater = new updater.NsisUpdater(build_config.publish, eaa)
} else if (process.platform == "darwin") {
    //@ts-ignore
    autoUpdater = new updater.MacUpdater(build_config.publish, eaa)
} else {
    //@ts-ignore
    autoUpdater = new updater.AppImageUpdater(build_config.publish, eaa)
} */

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
    // console.log(info)
    // fs.appendFileSync(path.resolve(eapp.getPath("home"), "a.txt"), JSON.stringify(info) + "\n")
    mainWin.webContents.send("update", JSON.stringify(info))
})

/* autoUpdater.on("error", data => {
    console.error(data)
    fs.appendFileSync(path.resolve(eapp.getPath("home"), "a.txt"), JSON.stringify(data) + "\n")
})

autoUpdater.on("update-not-available", info => {
    console.log(info)
    fs.appendFileSync(path.resolve(eapp.getPath("home"), "a.txt"), JSON.stringify(info) + "\n")
})

autoUpdater.on("update-cancelled", info => {
    console.log(info)
    fs.appendFileSync(path.resolve(eapp.getPath("home"), "a.txt"), JSON.stringify(info) + "\n")
}) */

autoUpdater.on("checking-for-update", () => {
    console.log("Checking")
    // fs.appendFileSync(path.resolve(eapp.getPath("home"), "a.txt"), "Checking\n")
})
// console.log(eapp)
let temp = path.resolve(eapp.getPath("userData"), "./temp")
fs.mkdirSync(path.resolve(eapp.getPath("userData"), "ffmpeg"), { recursive: true })
let config: {
    output: string,
    concurent_dl: number,
    concurent_process: number
} = {
    concurent_dl: 5, //Infinity,
    concurent_process: 5,
    output: path.resolve(eapp.getPath("desktop"), "./media")
}
// fs.mkdirSync(path.resolve(out, "Music", "Various Artists"), { recursive: true })
// fs.mkdirSync(path.resolve(out, "TV Shows"), { recursive: true })
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

type infoVid = {
    id: number,
    video: string,
    audio: string,
    thumbnail: string
    output: string,
    title: string,
    track: number,
    query: ytdl.VideoDetails
}

electron.ipcMain.handle("getpl", async (ev, link, audioOnly = true, reversePL = false, removeExtras = false, customRegExp: string[] = []) => {
    let list: { title: string, query: ytpl.Item }[] = []
    let pl: ytpl.Result
    try {
        pl = await ytpl(link, { limit: Infinity })
    } catch {
        ev.sender.send("error", "Error getting playlist info")
        return
    }
    if (pl == null) {
        ev.sender.send("error", "No Playlist Found")
        return
    } else {
        ev.sender.send("result", `Playlist ${pl.title} Found!`)
    }

    for (let query of pl.items) {
        let title = query.title
        for (let regexp of customRegExp) {
            // console.log(customRegExp)
            // new RegExp(new RegExp(regexp), "g")
            try {
                let rex = new RegExp(regexp, "g")
                title = title.replace(rex, '')
            } catch (err) {
                ev.sender.send("error", "Invalid Regular Expression")
                ev.sender.send("error", err)
                return
            }
            // console.log(rex, title)
        }
        list.push({ title, query })
    }

    if (reversePL) {
        list.reverse()
    }

    selWin.show()
    selWin.webContents.send("selector", { audioOnly, removeExtras, list, title: pl.title, url: pl.url })
    mainWin.minimize()
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
    // downloading--
    if (dlqueue.length > 0) {
        nextevent.emit(`startdl_${dlqueue[ 0 ]}`)
        dlqueue.shift()
    }
    // console.log("dq", downloading, dlqueue)

})

nextevent.on("doneproc", () => {
    // processing--
    if (procqueue.length > 0) {
        nextevent.emit(`startproc_${procqueue[ 0 ]}`)
        procqueue.shift()
    }
    // console.log("pq", processing, procqueue)
})

electron.ipcMain.handle("dlpl", (ev, data: { info: infoPL[], audioOnly: boolean, removeExtras: boolean, title: string }) => {
    nextevent.setLock()
    selWin.hide()
    mainWin.restore()
    console.log("Starting pl dl")
    mainWin.webContents.send("result", "Downloading Playlist")
    if (data.audioOnly) {
        data.title = data.title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '').replace(/\.$/, '').replaceAll(/[ ]+/g, ' ')
        fs.mkdirSync(path.resolve(config.output, "Music", "Various Artists", data.title), { recursive: true })
    } else {
        data.title = data.title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '').replace(/\.$/, '').replaceAll(/[ ]+/g, ' ')
        fs.mkdirSync(path.resolve(config.output, "TV Shows", data.title, "Season 00"), { recursive: true })
    }
    // console.log(data.removeExtras)
    for (let i = 0; i < data.info.length; i++) {
        let thisId = id++
        let query = data.info[ i ].query
        let thisTrack = `${i + 1}`
        if (thisTrack[ 0 ] !== "0") {
            thisTrack = `0${thisTrack}`
        }
        let info: infoPL = {
            id: thisId,
            video: path.resolve(temp, `${thisId}_video.mp4`),
            audio: path.resolve(temp, `${thisId}_audio.mp4`),
            thumbnail: path.resolve(temp, `${thisId}_thumbnail.jpeg`),
            output: path.join('${dir}', `\${replace_title}${data.info[ i ].title.replaceAll("w/", 'with').replace(/[<>:"/\\|?*]/g, '').replace(/\.$/, '').replaceAll(/[ ]+/g, ' ')}.${data.audioOnly ? "mp3" : "mp4"}`),
            title: data.info[ i ].title.replace(/\.$/, '').replaceAll(/[ ]+/g, ' '),
            track: i + 1,
            query,
        }
        let onError = (err) => {
            if (err) {
                mainWin.webContents.send("error", `Error Downloading: ${info.title}`)
                return `Error Downloading: ${info.title}`
            }
        }
        info.output = data.removeExtras ? info.output.replace(/[0-9]+\.\(\)\?/g, '').replace(/\( \)?\([A-z0-9 ]+\)/g, '') : info.output
        fs.writeFileSync(path.resolve(temp, "id.json"), JSON.stringify({ id }))
        if (!data.audioOnly) {
            info.output = info.output.replace('${dir}', path.resolve(config.output, "TV Shows", data.title, "Season 00") ).replace("${replace_title}", `S00e${thisTrack} - `)
            https.get(info.query.bestThumbnail.url, (res) => {
                let stream = fs.createWriteStream(path.resolve(info.thumbnail), { autoClose: true })
                res.pipe(stream)
                stream.on("finish", () => {
                    stream.close()
                })
            })
        } else {
            info.output = info.output.replace('${dir}', path.resolve(config.output, "Music", "Various Artists", data.title)).replace("${replace_title}", ''/* `${thisTrack} -` */)
            fs.writeFileSync(path.resolve(config.output, "Music", "Various Artists", data.title, "track.json"), JSON.stringify({ track }))
        }
        let alt = 0;
        let outputRaw = info.output.replace(".mp3", " ").replace(".mp4", " ")
        let titleRaw = info.title
        while (fs.existsSync(info.output)) {
            ++alt;
            info.output = data.audioOnly ? outputRaw + ` (alternate ${alt}).mp3` : outputRaw + ` (alternate ${alt}).mp4`   //.replace(".mp3"," (alternate).mp3").replace(".mp4", " (alternate).mp4")
            info.title = titleRaw + ` (alternate ${alt})`
        }
        fs.writeFileSync(info.output, "Checker File")

        nextevent.once(`startdl_${info.id}`, () => {
            downloading++
            let vidDone = false
            let audioDone = false
            let videoFile: fs.WriteStream
            let videoStream: import("stream").Readable
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
                    mainWin.webContents.send("result", `Processing ${info.title}`)
                    try {
                        let date = dayjs()
                        fs.appendFileSync(path.resolve(eapp.getPath("userData"), "ffmpeg.log"), `${info.title} started at ${date.format("DD/MM/YYYY HH:mm:ss")}\n`)
                        let ffmpegLog = fs.createWriteStream(path.resolve(eapp.getPath("userData"), "ffmpeg", `${info.title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '')}.log`), { autoClose: true, flags: 'a+' })
                        let ffmpeg: cp.ChildProcess
                        if (data.audioOnly) {
                            ffmpeg = cp.spawn(ffmpegPath, [
                                '-i', `${info.audio}`,
                                '-map', '0:a',
                                '-c:a', 'mp3',
                                // '-f', "mp3",
                                '-metadata', `album=${data.title}`,
                                '-metadata', `album_artist=Various Artists`,
                                '-metadata', `artist=${info.query.author.name || "No Artist"}`,
                                '-metadata', `author=${info.query.author.name || "No Author"}`, //.replaceAll("'", '')
                                '-metadata', `composer=${info.query.author.name || "No Composer"}`, //.replaceAll("'", '')
                                '-metadata', `publisher=${info.query.author.name || "No Publisher"}`, //.replaceAll("'", '')
                                '-metadata', `performer=${info.query.author.name || "No Performer"}`, //.replaceAll("'", '')
                                '-metadata', `disc=1`,
                                '-metadata', `genre=YoutTube Video`,
                                '-metadata', `title=${info.title}`,
                                '-metadata', `track=${info.track}`,
                                "-y",
                                // `comment="${info.query.description?.replaceAll('"', '').replaceAll("'", '') || "No Description"}"`,
                                `${info.output}`
                            ], {
                                shell: false,
                            })
                            // console.log(ffmpeg.spawnargs.join(" "))
                        } else {
                            ffmpeg = cp.spawn(ffmpegPath, [
                                '-i', `${info.video}`,
                                '-i', `${info.audio}`,
                                '-i', `${info.thumbnail}`,
                                '-map', '0:v',
                                '-c:v:0', 'copy',
                                '-map', '1:a',
                                '-c:a:0', 'aac',
                                '-map', '2:v',
                                '-c:v:1', 'mjpeg',
                                '-disposition:v:1', 'attached_pic',
                                // '-f', 'mp4',
                                '-metadata', `album=${data.title}`,
                                '-metadata', `album_artist=${data.title}`,
                                '-metadata', `artist=${info.query.author.name || "No Artist"}`,
                                '-metadata', `author=${info.query.author.name || "No Author"}`, //.replaceAll("'", '')
                                '-metadata', `composer=${info.query.author.name || "No Composer"}`, //.replaceAll("'", '')
                                '-metadata', `publisher=${info.query.author.name || "No Publisher"}`, //.replaceAll("'", '')
                                '-metadata', `performer=${info.query.author.name || "No Performer"}`, //.replaceAll("'", '')
                                '-metadata', `disc=1`,
                                '-metadata', `title=${info.title.replaceAll('"', '')}`, //.replaceAll("'", '')}
                                '-metadata', `track=${info.track}`,
                                "-y",
                                // ` comment="${info.query.description?.replaceAll('"', '').replaceAll("'", '') || "No Description"}"`,
                                `${info.output}`
                                // "pipe:1"
                            ], {
                                shell: false,
                                // stdio: ["pipe", output, "pipe"]
                            })
                            // console.log(ffmpeg.spawnargs.join(" "))
                        }
                        ffmpeg.on("error", () => { ffmpegLog.write(onError) })
                        ffmpeg.stderr.pipe(ffmpegLog, { end: true })
                        // ffmpeg.stderr.pipe(process.stderr, { end: true })
                        ffmpeg.stdout.pipe(ffmpegLog, { end: true })
                        ffmpeg.stdout.pipe(process.stdout, { end: true })
                        ffmpeg.on("exit", () => {
                            ffmpegLog.close()
                            if (!data.audioOnly) {
                                fs.rmSync(info.video)
                                fs.rmSync(info.thumbnail)
                            }
                            fs.rmSync(info.audio)
                            mainWin.webContents.send("result", `${info.title} Done`)
                            // console.log("Done")
                            nextevent.emit("doneproc")
                            processing--
                            // eapp.quit()
                        })
                    } catch {
                        mainWin.webContents.send("error", `Error Downloading: ${info.title}`)
                        return `Error Downloading: ${info.title}`
                    }
                }
                let checkAndCloseAudio = () => {
                    // console.log("audio done")
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
                    // console.log("video done")
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

electron.ipcMain.handle("dlvid", async (ev, link: string, audioOnly = false, removeExtras = false, customRegExp: string[] = []) => {
    selWin.hide()
    mainWin.restore()
    // console.log("starting vid dl")
    // console.log(await ytsr(link), link)
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
        ev.sender.send("result", `Downloading ${query.title}`)
        if (audioOnly) {
            fs.mkdirSync(path.resolve(config.output, "Music", "Various Artists", "Mixed"), { recursive: true })
            track = fs.existsSync(path.resolve(config.output, "Music", "Various Artists", "Mixed", "track.json")) ? JSON.parse(fs.readFileSync(path.resolve(config.output, "Music", "Various Artists", "Mixed", "track.json"), { encoding: 'utf-8' })).track : 0;
        } else {
            fs.mkdirSync(path.resolve(config.output, "TV Shows", "Mixed", "Season 00"), { recursive: true })
            track = fs.existsSync(path.resolve(config.output, "TV Shows", "Mixed", "track.json")) ? JSON.parse(fs.readFileSync(path.resolve(config.output, "TV Shows", "Mixed", "track.json"), { encoding: 'utf-8' })).track : 1;
        }
        let thisTrack = `${++track}`
        if (thisTrack[ 0 ] !== "0") {
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
            // video_output: path.resolve(temp, `${thisId}.mp4`),
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
        info.output = removeExtras ? info.output.replace(/[0-9]+\. /g, '').replace(/ \([A-z0-9 ]+\)/g, '') : info.output
        fs.writeFileSync(path.resolve(temp, "id.json"), JSON.stringify({ id }))
        // console.log("hi", info.id)
        if (!audioOnly) {
            info.output = info.output.replace('${dir}', path.resolve(config.output, "TV Shows", "Mixed", "Season 00") + path.sep).replace("${replace_title} ", `S00e${thisTrack} -`)
            fs.writeFileSync(path.resolve(config.output, "TV Shows", "Mixed", "track.json"), JSON.stringify({ track }))
            https.get(info.query.thumbnails[0].url, (res) => {
                let stream = fs.createWriteStream(path.resolve(info.thumbnail), { autoClose: true })
                res.pipe(stream)
                stream.on("finish", () => {
                    stream.close()
                })
            })
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
        nextevent.once(`startdl_${info.id}`, () => {
            downloading++
            let vidDone = false
            let audioDone = false
            let videoFile: fs.WriteStream
            let videoStream: import("stream").Readable
            try {
                if (!audioOnly) {
                    videoFile = fs.createWriteStream(info.video, { autoClose: true })
                    videoStream = ytdl(link, { liveBuffer: 25000, highWaterMark: 1024 * 1024 * 64, quality: "highestvideo" })
                }
                let audioFile = fs.createWriteStream(info.audio, { autoClose: true })
                let audioStream = ytdl(link, { liveBuffer: 25000, highWaterMark: 1024 * 1024 * 64, quality: "highestaudio" })
                let finsh = () => {
                    nextevent.emit("donedl")
                    downloading--
                    processing++
                    ev.sender.send("result", `Processing ${info.title}`)
                    try {
                        let date = dayjs()
                        fs.appendFileSync(path.resolve(eapp.getPath("userData"), "ffmpeg.log"), `${info.title} started at ${date.format("DD/MM/YYYY HH:mm:ss")}\n`)
                        let ffmpegLog = fs.createWriteStream(path.resolve(eapp.getPath("userData"), "ffmpeg", `${info.title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '')}.log`), { autoClose: true, flags: 'a+' })
                        let ffmpeg: cp.ChildProcess
                        if (audioOnly) {
                            // console.log(title)
                            ffmpeg = cp.spawn(ffmpegPath, [
                                '-i', `${info.audio}`,
                                '-map', '0:a',
                                '-c:a', 'mp3',
                                '-metadata', `title=${title}`,
                                '-metadata', `artist=${info.query.author.name || "No Artist"}`,
                                '-metadata', `author=${info.query.author.name || "No Author"}`, //.replaceAll("'", '')
                                '-metadata', `composer=${info.query.author.name || "No Composer"}`, //.replaceAll("'", '')
                                '-metadata', `publisher=${info.query.author.name || "No Publisher"}`, //.replaceAll("'", '')
                                '-metadata', `performer=${info.query.author.name || "No Performer"}`, //.replaceAll("'", '')
                                '-metadata', `genre=YoutTube Video`,
                                '-metadata', `album_artist=Various Artists`,
                                '-metadata', `track=${info.track}`,
                                '-metadata', `disc=1`,
                                '-metadata', `album=Mixed`,
                                "-y",
                                // `comment="${info.query.description?.replaceAll('"', '').replaceAll("'", '') || "No Description"}"`,
                                info.output
                            ], {
                                shell: false,
                            })
                        } else {
                            ffmpeg = cp.spawn(ffmpegPath, [
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
                                '-metadata', `author=${info.query.author.name || "No Author"}`, //.replaceAll("'", '')
                                '-metadata', `composer=${info.query.author.name || "No Composer"}`, //.replaceAll("'", '')
                                '-metadata', `publisher=${info.query.author.name || "No Publisher"}`, //.replaceAll("'", '')
                                '-metadata', `performer=${info.query.author.name || "No Performer"}`, //.replaceAll("'", '')
                                '-metadata', `album=Mixed`,
                                '-metadata', `track=${info.track}`,
                                '-metadata', `disc=1`,
                                "-y",
                                // ` comment="${info.query.description?.replaceAll('"', '').replaceAll("'", '') || "No Description"}"`,
                                info.output
                            ], {
                                shell: false,
                            })
                        }
                        ffmpeg.on("error", () => { ffmpegLog.write(onError) })
                        ffmpeg.stderr.pipe(ffmpegLog, { end: true })
                        ffmpeg.stderr.pipe(process.stderr, { end: true })
                        ffmpeg.stdout.pipe(ffmpegLog, { end: true })
                        ffmpeg.stdout.pipe(process.stdout, { end: true })
                        ffmpeg.on("exit", () => {
                            ffmpegLog.close()
                            if (!audioOnly) {
                                fs.rmSync(info.video)
                                fs.rmSync(info.thumbnail)
                            }
                            fs.rmSync(info.audio)
                            ev.sender.send("result", `${info.title} Done`)
                            // console.log("Done")
                            nextevent.emit("doneproc")
                            processing--
                            // eapp.quit()
                        })
                    } catch {
                        ev.sender.send("error", `Error Downloading: ${info.title}`)
                        return `Error Downloading: ${info.title}`
                    }
                }
                let checkAndCloseAudio = () => {
                    // console.log("audio done")
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
                    // console.log("video done")
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

electron.ipcMain.handle("valid", (ev, link: string) => {
    try {
        return ytpl.validateID(link) ? "pl" : ytdl.validateURL(link) ? true : false
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
    // console.log(dl, proc, parseInt(dl), parseInt(proc))
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
    // console.log(config, isNaN(parseInt(dl)), isNaN(parseInt(proc)))

    fs.writeFileSync(path.resolve(eapp.getPath("userData"), "config.json"), JSON.stringify(config, (_key, val) => (val == Infinity ? "infinity" : val), 4))
    return "Values Set\n"
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

    // win.webContents.setWindowOpenHandler((details) => {
    //     console.log("1")
    //     return {
    //         action: "deny"
    //     }
    // })
    win.webContents.on("will-navigate", open)
    // win.webContents.on("new-window", open)
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
    let _port = random.num()
    if (_port < 1024) {
        return startServer()
    } else {
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
}

app.all("*", (req, res, next) => {
    res.removeHeader("x-powered-by")
    next()
})
app.use(express.static(path.resolve(__dirname, "static"), { dotfiles: 'ignore', extensions: [ 'html' ] }))
app.disable("x-powered-by")

let mainWin: electron.BrowserWindow
let selWin: electron.BrowserWindow
eapp.on("window-all-closed", close)

eapp.whenReady().then(() => {
    console.log("Started!")
    console.log(config)
    if (fs.existsSync(path.resolve(eapp.getPath("userData"), "config.json"))) {
        config = JSON.parse(fs.readFileSync(path.resolve(eapp.getPath("userData"), "config.json"), { encoding: 'utf-8' }), (_key, val) => (val == "infinity" ? Infinity : val))
    } else {
        fs.writeFileSync(path.resolve(eapp.getPath("userData"), "config.json"), JSON.stringify(config, null, 4))
    }
    console.log(config)
    port = startServer()
    mainWin = createWin(`http://localhost:${port}`, path.resolve(__dirname, "preloads", "index.js"))
    selWin = createWin(`http://localhost:${port}/select`, path.resolve(__dirname, "preloads", "select.js"), false)
    selWin.removeAllListeners("close")
    selWin.on("close", (e) => {
        selWin.hide()
        e.preventDefault()
    })
    autoUpdater.checkForUpdates()
})/* .then(mainVid) */
