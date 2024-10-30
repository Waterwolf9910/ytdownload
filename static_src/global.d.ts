import ytpl = require("ytpl")

type listener = (responseType: string) => any
type playlistListener = (vidList: {
    items: {
        title: string,
        query: ytpl.Item
    }[],
    title: string,
    url: string
}) => any
type progressListener = (title: string, type: 'dl' | 'process', value: number, max: number, dl_type: 'audio' | 'video') => any

declare global {
    interface Window {
        api: {
            setLogListener: (listenerFunc: listener) => void,
            setErrorListener: (listenerFunc: listener) => void,
            setDLListener: (listenerFunc: listener) => void,
            setPLListener: (listenerFunc: playlistListener) => void
            setProgressListener: (listenerFunc: progressListener) => void,
            concurrency: (dl: number | string, proc: number | string) => Promise<string>
            plRequest: (link: string, reversePl: boolean, customRegExp: string[]) => void,
            downloadPl: (list: {title: string, query: ytpl.Item}[], audioOnly: boolean, title: string) => void
            downloadVid: (url: string, audioOnly: boolean, customRegExp: string[]) => void
            selectOutput: () => void,
            valid: (url: string) =>  Promise<"pl" | boolean>,
            theme: (theme?: string) => Promise<string>
        }
    }
}
