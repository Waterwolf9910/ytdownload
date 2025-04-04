import fs = require("fs")
import path = require("path")
import workers = require("worker_threads")
if (!workers.isMainThread) {
    try {
        require(path.resolve(process.resourcesPath, ".pnp.cjs")).setup()
    } catch {
        require("../../.pnp.cjs").setup()
    }
}
// import electron = require("electron")
import ytdl = require("@distube/ytdl-core")
import dayjs = require("dayjs")
import ffmpegPath = require("ffmpeg-static")
import child_process = require('child_process')
import readline = require('readline')
import https = require("https")

//@ts-ignore
let ffmpeg_path: string = ffmpegPath

let cache_info_path: string
let cache_path: string
let cache: {[video_id: string]: {path: string, format: string}}
if (workers.isMainThread) {
    cache_path = path.resolve(require('electron').app.getPath("userData"), "video_cache")
    cache_info_path = path.resolve(require('electron').app.getPath("userData"), "video_cache.json")
    cache = !fs.existsSync(cache_info_path) ? {} : JSON.parse(fs.readFileSync(cache_info_path, 'utf-8'))
    fs.mkdirSync(cache_path, {recursive: true})
}


interface pi {
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
    video_id: string
    // audio_url: string,
    // video_url: string
}

interface single_process_info extends pi {
    from_pl: false
}

interface pl_process_info extends pi {
    from_pl: true
    playlist_title: string
    playlist_author: string
}

type process_info = single_process_info | pl_process_info

// TODO: Check cache file to not redownload files
let download_requested = async (audio_only: boolean, info: process_info, message: (channel: string, ...args: any[]) => any, config: {video_format: string, audio_format: string, cookies: ytdl.Cookie[]}, _cache: typeof cache) => {

    let onError = (err: string | Error) => {
        message("error", err)
        return err
    }
    let ytdl_download = (video = false) => new Promise<void>((r, i) => {
        try {
            let agent = ytdl.createAgent(config.cookies, {
                connections: 4, pipelining: 2
            })
            let file = fs.createWriteStream(video ? info.video_path : info.audio_path)
            let stream = ytdl(info.url, { liveBuffer: 25000, quality: video ? 'highestvideo' : "highestaudio", agent })
                .on('error', (err) => {
                    i(err)
                })
                .on("progress", (length, downloaded, total) => {
                    message('progress', info.title, 'dl', downloaded, total, video ? 'video' : 'audio')
                })
            stream.pipe(file, { end: true })
            file.on('finish', () => {
                file.close()
                r()
            })
        } catch (err) {
            i(err)
            console.error(err)
        }
    })

    if (_cache[info.video_id] &&
        (_cache[info.video_id].format == (audio_only ? config.audio_format : config.video_format)) &&
        fs.existsSync(_cache[info.video_id].path)) 
    {
        return 304
    }

    let thumbnail = new Promise<void>(r => {
        https.get(info.thumbnail_url, res => {
            let stream = fs.createWriteStream(info.thumbnail_path, { autoClose: true })
            res.pipe(stream)
            res.on('end', () => {
                stream.close()
                r()
            })
            res.on('error', (err) => {
                console.error(err)
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
        await thumbnail
        await audio_promise
        await video_promise
    } catch (err) {
        onError(`Error Downloading: ${info.title} are you rate limited? ${err.statusCode ? 'Error Code: ' + err.statusCode: ''}`)
        return err.statusCode ?? 503
    }

    return 200
}

let addition_options = (audio: boolean, config: { video_format: string, audio_format: string, cookies: ytdl.Cookie[] }) => {
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

let ffmpeg_process = async (audio_only: boolean, info: process_info, message: (channel: string, ...args: any[]) => any, config: {video_format: string, audio_format: string, cookies: ytdl.Cookie[]}, userData: string, _cache: typeof cache, cache_path: string) => {

    let onError = (err: Error | string) => {
        if (err) {
            message("error", `Error Downloading: ${info.title}`)
            return `Error Processing: ${info.title}`
        }
    }

    if (_cache[info.video_id] &&
        ((_cache[info.video_id].format == (audio_only ? config.audio_format : config.video_format)) &&
        fs.existsSync(_cache[info.video_id].path)))
    {
        fs.copyFileSync(_cache[info.video_id].path, info.output_path)
        return 200
    }

    let date = dayjs()
    fs.appendFileSync(path.resolve(userData, "ffmpeg.log"), `${info.title} started at ${date.format("DD/MM/YYYY HH:mm:ss")}\n`)
    let ffmpegLog = fs.createWriteStream(path.resolve(userData, "ffmpeg", `${info.title.replaceAll("w/", 'with').replaceAll(/[<>:"/\\|?*]/g, '')}.log`), { autoClose: true, flags: 'a+' })
    let ffmpeg = child_process.spawn(ffmpeg_path, [
        '-stats',
        '-progress', 'pipe:3',
        '-i', info.audio_path,
        '-i', info.thumbnail_path,
        ...(audio_only ? [] : [
            '-i', info.video_path,
        ]),
        '-map', '0:a',
        '-map', '1:v',
        '-c:v:0', 'copy',
        '-disposition:v:0', 'attached_pic',
        ...(audio_only ? [
        ] : [
            '-map', '2:v',
            '-c:v:1', 'copy',
            '-c:a:0', 'aac',
        ]),
        ...addition_options(audio_only, config),
        ...(info.from_pl ? [
            '-metadata', `album=${info.playlist_title}`,
            '-metadata', `album_artist=${info.playlist_author}`,
        ] : [
            '-metadata', `album=Mixed`,
            '-metadata', `album_artist=Various Artists`,
        ]),
        '-metadata:s:v:0', 'title=Album cover',
        '-metadata:s:v:0', 'comment="Cover (Front)"',
        '-metadata', `artist=${info.author_name || "No Artist"}`,
        '-metadata', `author=${info.author_name || "No Author"}`,
        '-metadata', `composer=${info.author_name || "No Composer"}`,
        '-metadata', `publisher=${info.author_name || "No Publisher"}`,
        '-metadata', `performer=${info.author_name || "No Performer"}`,
        '-metadata', `comment=${info.url}`,
        '-metadata', `genre=YouTube Video`,
        '-metadata', `title=${info.title}`,
        '-metadata', `track=${info.track}`,
        '-metadata', `disc=1`,
        "-y", info.output_path
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
    let ffprogress = readline.createInterface(ffmpeg.stdio[3] as import('stream').Readable)
    let ffstderr = readline.createInterface(ffmpeg.stderr)
    let total = Infinity
    ffprogress.on('line', (data) => {
        if (data.startsWith('out_time_ms')) {
            let value = parseInt(data.replace("out_time_ms=", '')) / 1000
            if (isNaN(value) || value < 0) {
                return;
            }
            message('progress', info.title, 'process', value, total)
        }
        if (data == "progress=end") {
            message('progress', info.title, 'process', 1, 1)
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
    return await new Promise<number>(r => {
        ffmpeg.on("exit", () => {
            ffmpegLog.close()
            ffprogress.close()
            ffstderr.close()
            if (!audio_only) {
                fs.rmSync(info.video_path)
            }
            fs.rmSync(info.thumbnail_path)
            fs.rmSync(info.audio_path)
            if (ffmpeg.exitCode == 0) {
                message("log", `${info.title} Done`)
                fs.copyFileSync(info.output_path, path.resolve(cache_path, `${info.video_id}.${(audio_only ? config.audio_format : config.video_format)}`))
                r(200)
            } else {
                console.error(onError('true'))
                r(503)
            }
            // r(ffmpeg.exitCode == 0 ? 200 : 503)
        })
    })
}

type data = { audio_only: boolean, type: 'dl' | 'proc', info: process_info, config: { video_format: string, audio_format: string, cookies: ytdl.Cookie[]}, userData: string, cache: typeof cache, cache_path: string}

class Queue {
    #list: (Omit<data, "cache" | "cache_path"> & {sender: import('electron').WebContents})[] = []
    #inv: NodeJS.Timeout
    #avalible_workers: {worker: workers.Worker, msg_channel: workers.MessageChannel}[] = []
    #running: boolean = false
    #pwlock: number = -1
    #count: number = 0
    auto_stop: boolean = false
    max_count = 10;
    constructor (max_count = 10, run = false) {
        this.max_count = max_count
        this.#running = run;
        if (run) {
            this.start()
        }
    }
    
    #next = async () => {
        let data = this.#list.shift();
        if (!data) {
            return;
        }
        this.#count++;
        if (workers.isMainThread) {
            let electron = require('electron')
            if (this.#pwlock == -1 && !electron.powerSaveBlocker.isStarted(this.#pwlock)) {
                this.#pwlock = electron.powerSaveBlocker.start('prevent-app-suspension')
            }
        }
        let onLog = (msg) => {
            if (msg.status) {
                return
            }
            if (msg.channel != 'progress') {
                console.log(msg)
            }
            data.sender.send(msg.channel, ...msg.args)
        }
        let worker_info = this.#avalible_workers.shift()
        if (!worker_info) {
            worker_info = {
                msg_channel: new workers.MessageChannel(),
                worker: new workers.Worker(__filename, {
                    env: workers.SHARE_ENV,
                    name: data.type == 'dl' ? "Download" : "Process"
                })
            }
            worker_info.worker.postMessage(worker_info.msg_channel.port2, [worker_info.msg_channel.port2])
        }
        
        worker_info.msg_channel.port1.postMessage({
            audio_only: data.audio_only,
            config: data.config,
            info: data.info,
            type: data.type,
            userData: data.userData,
            cache,
            cache_path
        } satisfies data)

        worker_info.msg_channel.port1.on("message", onLog)
        
        let status = await new Promise<number>(r => {
            let func = (d) => {
                if (d.status) {
                    r(d.status)
                    worker_info.msg_channel.port1.off('message', func)
                }
            }
            worker_info.msg_channel.port1.on('message', func)
        })
        if (data.type == "dl") {
            if (status == 304) {

            } else if (status != 200) {
                fs.unlinkSync(path.resolve(data.info.output_path))
            } else {
                procqueue.add(data.audio_only, data.info, data.sender, 'proc', data.config, data.userData)
            }
        } else {
            if (status == 200) {
                cache[data.info.video_id] = {
                    format: data.audio_only ? data.config.audio_format : data.config.video_format,
                    path: path.resolve(cache_path, `${data.info.video_id}.${(data.audio_only ? data.config.audio_format : data.config.video_format)}`)
                }
                fs.writeFileSync(cache_info_path, JSON.stringify(cache))
            }
        }
        // if (status == 200 && data.type == 'dl') {
        // }
        
        worker_info.msg_channel.port1.off("message", onLog)

        let unrecoverable = status == 429 || status == 403
        this.#count--
        if (!this.#running || this.#count > this.max_count || unrecoverable) {
            worker_info.worker.terminate()
            if (this.#count == 0 && unrecoverable) {
                data.sender.send('error', "Downloads have been cancelled due to unrecoverable error")
                while (this.#list[0]) {
                    fs.unlinkSync(this.#list.shift().info.output_path)
                }
                // let len = this.#list.length;
                // for (let i = 0; i < len; ++i) {
                //     try {
                //         fs.unlinkSync(this.#list.shift().info.output_path)
                //     } catch {}
                // }
            }
            if (unrecoverable) {
                this.#running = false;
            }
            return
        }
        this.#avalible_workers.push(worker_info)
        this.#next()
    }

    add(audio_only: boolean, info: process_info, sender: import('electron').WebContents, type: 'dl' | 'proc', config: { video_format: string, audio_format: string, cookies: ytdl.Cookie[] }, userData: string)  {
        this.#list.push({audio_only, info, sender, type, config, userData})
        if (this.#count < this.max_count && this.#running) {
            this.#next()
        }
        //@ts-ignore
        procqueue.max_count = config.concurrent_process
    }

    start() {
        this.#inv = setInterval(() => {
            if (this.#count < this.max_count && this.#running) {
                this.#next()
            }
            if (this.#list.length == 0 && this.#pwlock != -1) {
                this.auto_stop == true ? this.stop() : workers.isMainThread ? require('electron').powerSaveBlocker.stop(this.#pwlock) : ''
                this.#pwlock = -1
            }
        }, 100)
        this.#running = true
    }

    stop() {
        this.#running = false
        this.#count = 0
        clearInterval(this.#inv)
        if (workers.isMainThread) {
            require('electron').powerSaveBlocker.stop(this.#pwlock)
            this.#pwlock = -1
        }
    }
}

let procqueue: Queue

if (!workers.isMainThread) {
    workers.parentPort.once("message", (msg: workers.MessagePort) => {
        msg.on("message", async (data: data) => {
            let status: number
            if (data.type == 'dl') {
                status = await download_requested(data.audio_only, data.info, (channel, ...args) => msg.postMessage({ channel, args }), data.config, data.cache)
                // msg.postMessage({status})
                // return
            } else {
                status = await ffmpeg_process(data.audio_only, data.info, (channel, ...args) => msg.postMessage({ channel, args }), data.config, data.userData, data.cache, data.cache_path)
            }
            msg.postMessage({status})
            // await data.func(...data.args)
        })
    })
} else {
    procqueue = new Queue()
    procqueue.start()
}

export = Queue
