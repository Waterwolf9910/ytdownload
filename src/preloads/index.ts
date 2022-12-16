import electron = require("electron")
let listeners = []
let errListeners = []
let dLListeners = []

electron.ipcRenderer.on("result", (_, msgType) => {
    for (let listenerFunc of listeners) {
        listenerFunc(msgType)
    }
})

electron.ipcRenderer.on("error", (_, errorType) => {
    for (let listenerFunc of errListeners) {
        listenerFunc(errorType)
    }
})

electron.ipcRenderer.on("update", (_, info) => {
    for (let listenerFunc of dLListeners) {
        listenerFunc(info)
    }
})

let concurrency = (param1, param2) => {
    return electron.ipcRenderer.invoke("set_concurrency", param1, param2)
}

let addResultListener = (listenerFunc) => {
    listeners.push(listenerFunc)
}

let addErrorListener = (listenerFunc) => {
    errListeners.push(listenerFunc)
}

let addDLListener = (listenerFunc) => {
    dLListeners.push(listenerFunc)
}

let dlRequest = (param1, param2, param3, param4, param5) => {
    electron.ipcRenderer.invoke("getpl", param1, param2, param3, param4, param5)
}

let sendToDL = (param1, param2, param3, param4) => {
    electron.ipcRenderer.invoke("dlvid", param1, param2, param3, param4)
}

let selectOutput = () => {
    electron.ipcRenderer.invoke("choose_output")
}

let valid = async (param1) => {
    return electron.ipcRenderer.invoke("valid", param1)
}

let main = async () => {
    electron.contextBridge.exposeInMainWorld("api", {
        addResultListener,
        addErrorListener,
        addDLListener,
        concurrency,
        dlRequest,
        sendToDL,
        selectOutput,
        valid
    })
}

main()
