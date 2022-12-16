import ytpl = require("ytpl")

export {}
type listener = (responseType: string) => any
type listener2 = (vidList: {
    list: {
        title: string,
        query: ytpl.Item
    }[],
    title: string,
    audioOnly: boolean
    removeExtras: boolean,
    url: string
}) => any

declare global {
    interface Window {
        api: {
            dlRequest: (link: string, audioOnly: boolean, reversePl: boolean, removeExtras: boolean, customRegExp: string[]) => void,
            addResultListener: (listenerFunc: listener) => void,
            addErrorListener: (listenerFunc: listener) => void,
            addDLListener: (listenerFunc: listener) => void,
            valid: (url: string) =>  Promise<"pl" | boolean>,
            sendToDL: (url: string, audioOnly: boolean, removeExtras: boolean, customRegExp: string[]) => void
            concurrency: (dl: number | string, proc: number | string) => Promise<string>
            selectOutput: () => void
        }
        selector: {
            addResultListener: (listenerFunc: listener) => void,
            addDataListener: (listenerFunc: listener2) => void
            sendToDL: (list: {title: string, query: ytpl.Item}[], audioOnly: boolean, removeExtras: boolean, title: string) => void
        }
    }
}
