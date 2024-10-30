/**
    frame=0
    fps=0.00
    stream_0_0_q=0.0
    bitrate=N/A
    total_size=0
    out_time_us=N/A
    out_time_ms=N/A
    out_time=N/A
    dup_frames=0
    drop_frames=0
    speed=N/A
    progress=continue
 */
let readline = require('readline')
let child_process = require('child_process')

// let _process = child_process.spawn("ffmpeg", [ "-f", "rawvideo", "-video_size", "20x20", "-i", "/dev/urandom", "-progress", "-", "-f", "rawvideo", "pipe:3" ], {
let _process = child_process.spawn(require("ffmpeg-static"), ["-i", "'./Quaoar - Camellia (for Thanks Twitter Follower 50k).mp3'", '-stats', "-progress", "pipe:3", "-y", "./out.avi"], {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe', 'pipe'],
})

let rl = readline.createInterface({
    input: _process.stdio[3]
})

let rl2 = readline.createInterface({
    input: _process.stderr
})

rl.on("line", (data) => {
    // if (data.startsWith("frame")) {
    //     console.log(data)
    //     console.log(parseInt(data.replace("frame=", "")))
    // }
    console.log(data)
    if (data.startsWith("progress")) {
        if (data == "progress=end") {
            console.log('done')
        }
    }
    if (data.startsWith("out_time_ms")) {
        console.log(parseOut(data))
    }
})

/**
 * 
 * @param {string} time 
 */
let parseTime = (time) => {
    let split = time.split(":")
    return (
        (parseFloat(split[0]) * 60 * 60) +
        (parseFloat(split[1]) * 60) +
        (parseFloat(split[2]))
    ) * 1000
}

/**
 * 
 * @param {string} duration 
 */
let parseDuration = (duration) => {
    return parseTime(duration.trim().toLowerCase().replace(/duration: ?([0-9:.]+).*/, "$1"))
}

/**
 * 
 * @param {string} out 
 */
let parseOut = (out) => {
    return parseInt(out.replace("out_time_ms=", '')) / 1000
}

rl2.on("line", (data) => {
    if (data.includes("Duration")) {
        console.log(data, parseDuration(data))
    }
})
