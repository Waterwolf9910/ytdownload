//@ts-ignore
let url: HTMLInputElement = document.getElementById("link")
//@ts-ignore
let audio: HTMLInputElement = document.getElementById("audio")
//@ts-ignore
let reverse: HTMLInputElement = document.getElementById("reverse")
//@ts-ignore
let remove: HTMLInputElement = document.getElementById("remove")
//@ts-ignore
let submit: HTMLInputElement = document.getElementById("submit")
//@ts-ignore
let dl: HTMLInputElement = document.getElementById("dl")
//@ts-ignore
let proc: HTMLInputElement = document.getElementById("proc")
//@ts-ignore
let logs: HTMLTextAreaElement = document.getElementById("logs")
//@ts-ignore
let err: HTMLTextAreaElement = document.getElementById("errors")
//@ts-ignore
let regexp: HTMLTextAreaElement = document.getElementById("custom_regexp")
//@ts-ignore
let pbar: HTMLProgressElement = document.getElementById("dl-bar")
let check = document.getElementById("check")
let root = document.getElementById("root")
let out = document.getElementById("out")
let sender = document.getElementById("speed")

/* let resize = () => {
    root.style.top = `${ (window.outerHeight / 2) - root.clientHeight }px`.replace("-", '')
    root.style.left = `${ (window.outerWidth / 2) - (err.clientWidth) }px`.replace("-", '')
    submit.style.marginTop = "7px"
    submit.style.marginBottom = "7px"
    // submit.style.height = "25p"
    // submit.style.width = "45px"
    // submit.style.marginLeft = `${ (err.clientWidth - 23) }px`
    check.style.top = '7x'
    err.style.height = "100px"
    err.style.width = "184px"
    logs.style.height = "100px"
    logs.style.width = "184px"
}
resize() */
// window.api.addResultListener((a) => {
//     console.log(a)
// })
// submit.addEventListener("click", (ev) => {
// })
let valid = false
let isPL = false
url.addEventListener("input", async (a) => {
    // console.log("a")
    try {
        new URL(url.value)
        check.style.backgroundColor = "green"
        if (!(await window.api.valid(url.value))) {
            check.style.backgroundColor = "yellow"
            reverse.disabled = true
            submit.disabled = true
            valid = false
            isPL = false
        } else if (await window.api.valid(url.value) == "pl") {
            check.style.backgroundColor = "green"
            reverse.disabled = false
            submit.disabled = false
            isPL = true
            valid = true
        } else {
            isPL = false
            check.style.backgroundColor = "green"
            reverse.disabled = true
            submit.disabled = false
            valid = true
        }
    } catch (err) {
        submit.disabled = true
        reverse.disabled = true
        check.style.backgroundColor = "red"
        valid = false
        // console.log(err)
    }
})

let sendReq = () => {
    console.log(isPL)
    if (valid && isPL) {
        // let regex = regexp.value.split(",")
        window.api.dlRequest(url.value, audio.checked, reverse.checked, remove.checked, regexp.value.split(/, {2}/))
    } else if (valid) {
        window.api.sendToDL(url.value, audio.checked, remove.checked, regexp.value.split(/, {2}/))
    } else {
        alert("Not a valid yt link")
    }
}

url.addEventListener("keydown", (e) => {
    if (e.key == "Enter" || e.code == "Enter") {
        sendReq()
    }
})

submit.addEventListener("click", sendReq)

// window.addEventListener("resize", resize)
out.addEventListener("click", () => {
    window.api.selectOutput()
})

window.api.addResultListener((data) => {
    // alert(data)
    logs.value += `${data}\n`
})

window.api.addErrorListener(data => {
    err.value += `${data}\n`
})

window.api.addDLListener(_info => {
    let info: {
        total: number
        delta: number
        transferred: number
        /**out of 100 (float) */
        percent: number
        bytesPerSecond: number
    } = JSON.parse(_info) 
    pbar.style.display = "inline-block"
    pbar.value = info.percent
})

sender.addEventListener("click", async () => {
    logs.value += await window.api.concurrency(dl.value, proc.value)//"Values Set\n"
})
