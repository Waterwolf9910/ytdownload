import electron = require("electron")

let dataListeners = []
let resultListeners = []
electron.ipcRenderer.on("selector", (ev, data) => {
    for (let func of dataListeners) {
        func(data)
    }
})

electron.ipcRenderer.on("result", (ev, data) => {
    for (let func of resultListeners) {
        func(data)
    }
})

let sendToDL = (param1, param2, param3, param4) => {
    electron.ipcRenderer.invoke("dlpl", {info: param1, audioOnly: param2, removeExtra: param2, title: param4})
}

let addDataListener = (listenerFunc) => {
    dataListeners.push(listenerFunc)
}

let addResultListener = (listenerFunc) => {
    resultListeners.push(listenerFunc)
}

electron.contextBridge.exposeInMainWorld("selector", {
    addDataListener,
    addResultListener,
    sendToDL
})

