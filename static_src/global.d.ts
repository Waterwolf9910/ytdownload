import ytpl = require("ytpl")

type listener = (responseType: string) => any
type playlistListener = (vidList: {
    items: {
        title: string,
        query: ytpl.Item
    }[],
    title: string,
    url: string,
    start_index: number,
}) => any
type progressListener = (title: string, type: 'dl' | 'process', value: number, max: number, dl_type: 'audio' | 'video') => any

declare global {
    type program_config = {
        output: string,
        concurrent_dl: number,
        concurrent_process: number,
        video_format: 'av1' | 'mp4' | 'flv' | 'mkv' | 'webp',
        audio_format: 'flac' | 'mp3' | 'aac' | 'opus' | 'pcm_f32le' | 'pcm_f16le',
        theme: "light" | "dark",
        cookies: import('@distube/ytdl-core').Cookie[],
    }
    interface Window {
        api: {
            setLogListener: (listenerFunc: listener) => void,
            setErrorListener: (listenerFunc: listener) => void,
            setDLListener: (listenerFunc: listener) => void,
            setPLListener: (listenerFunc: playlistListener) => void
            setProgressListener: (listenerFunc: progressListener) => void,
            concurrency: (dl: number | string, proc: number | string) => Promise<string>
            plRequest: (link: string, reversePl: boolean, customRegExp: string[], range_start: number, range_end: number) => void,
            downloadPl: (list: {title: string, query: ytpl.Item}[], audioOnly: boolean, title: string, start_index: number) => void
            downloadVid: (url: string, audioOnly: boolean, customRegExp: string[]) => void
            selectOutput: () => Promise<string>,
            valid: (url: string) =>  Promise<"pl" | boolean>,
            theme: (theme?: string) => Promise<string>,
            setConfig: (config: program_config) => Promise<void>,
            getConfig: () => Promise<program_config>
        }
    }
}
