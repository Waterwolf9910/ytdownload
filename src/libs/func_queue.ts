import electron = require("electron")
import workers = require("worker_threads")

type func<args extends any[] = []> = ((...args: args) => any | Promise<any>)
type queue_item = { func: func<any[]>, args: any[] }

class FuncQueue {
    #list: queue_item[] = []
    #inv: NodeJS.Timeout
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
        if (this.#pwlock == -1 && !electron.powerSaveBlocker.isStarted(this.#pwlock)) {
            this.#pwlock = electron.powerSaveBlocker.start('prevent-app-suspension')
        }
        let msg_channel = new workers.MessageChannel()
        let worker = new workers.Worker(__filename, {
            env: workers.SHARE_ENV,
            // workerData: data,
        })
        // @ts-ignore
        workers.markAsUnclonable(data)
        worker.postMessage(msg_channel.port2, [msg_channel.port2])
        msg_channel.port1.postMessage(data)
        
        await new Promise<void>(r => worker.once('exit', () => {
            r()
        }))

        if (!this.#running) {
            return
        }
        this.#next()
    }

    add<args extends any[] = []>(func: func<args>, ...args: args)  {
        this.#list.push({func, args})
        if (this.#count < this.max_count && this.#running) {
            this.#next()
        }
    }

    start() {
        this.#inv = setInterval(() => {
            if (this.#count < this.max_count) {
                this.#next()
            }
            if (this.#list.length == 0 && this.#pwlock != -1) {
                this.auto_stop == true ? this.stop() : electron.powerSaveBlocker.stop(this.#pwlock)
                this.#pwlock = -1
            }
        }, 100)
    }

    stop() {
        this.#running = true
        this.#count = 0
        clearInterval(this.#inv)
        electron.powerSaveBlocker.stop(this.#pwlock)
        this.#pwlock = -1
    }
}

if (!workers.isMainThread) {
    workers.parentPort.on("message", (msg: workers.MessagePort) => {
        msg.on("message", async (data: queue_item) => {
            await data.func(...data.args)
        })
    })
}

export = FuncQueue
