import electron = require("electron/renderer")
let logListener: import('../../static_src/global').listener = () => null
let errListener: import('../../static_src/global').listener = () => null
let dLListener: import('../../static_src/global').listener = () => null
let plListener: import('../../static_src/global').playlistListener = () => null
let progressListener: import('../../static_src/global').progressListener = () => null

electron.ipcRenderer.on("log", (_, msgType) => {
    logListener(msgType)
})

electron.ipcRenderer.on("error", (_, errorType) => {
    errListener(errorType)
})

electron.ipcRenderer.on("update", (_, info) => {
    dLListener(info)
})

electron.ipcRenderer.on("selector", (ev, data) => {
    plListener(data)
})

electron.ipcRenderer.on("progress", (ev, title, type, value, max, dl_type) => {
    progressListener(title, type, value, max, dl_type)
})

let concurrency = (param1, param2) => {
    return electron.ipcRenderer.invoke("set_concurrency", param1, param2)
}

let setLogListener = (listenerFunc) => {
    logListener = listenerFunc
}

let setErrorListener = (listenerFunc) => {
    errListener = listenerFunc
}

let setDLListener = (listenerFunc) => {
    dLListener = listenerFunc
}

let setProgressListener = (listenerFunc) => {
    progressListener = listenerFunc
}

let plRequest = (param1, param2, param3) => {
    electron.ipcRenderer.invoke("getpl", param1, param2, param3)
}

let downloadVid = (param1, param2, param3, param4) => {
    electron.ipcRenderer.invoke("dlvid", param1, param2, param3, param4)
}


let selectOutput = () => {
    electron.ipcRenderer.invoke("choose_output")
}

let valid = (param1) => {
    return electron.ipcRenderer.invoke("valid", param1)
}

let theme = (theme = null) => {
    return electron.ipcRenderer.invoke("theme", theme)
}
let downloadPl = (param1, param2, param3) => {
    electron.ipcRenderer.invoke("dlpl", { info: param1, audioOnly: param2, title: param3 })
}

let setPLListener = (listenerFunc) => {
    plListener = listenerFunc
}

electron.contextBridge.exposeInMainWorld("api", {
    setLogListener,
    setErrorListener,
    setDLListener,
    setPLListener,
    setProgressListener,
    concurrency,
    plRequest,
    downloadVid,
    downloadPl,
    selectOutput,
    valid,
    theme
})
