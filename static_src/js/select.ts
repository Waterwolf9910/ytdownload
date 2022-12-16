let list = document.getElementById("list")
let send = document.getElementById("submit")
let send2 = document.getElementById("submit2")
//@ts-ignore
let title: HTMLAnchorElement = document.getElementById("pl_title")
// let listContain = document.getElementById("root")

let _internal: {list: {title: string, query: import("ytpl").Item}[], audioOnly: boolean, removeExtras: boolean, title: string} = {
    list: [],
    audioOnly: false,
    removeExtras: false,
    title: ""
}

// let repos = () => {
//     // listContain.style.top = `${(window.innerHeight / 2) - root.clientHeight}px`.replace("-", '')
//     // listContain.style.left = `${(window.innerWidth / 2) - (root.clientWidth)}px`.replace("-", '')
//     // title.style.left = `${ (window.innerWidth / 2) - title.clientWidth }px`
//     send.style.left = `${(window.outerWidth / 2) - send.clientWidth}px`.replace("-", '')
//     send2.style.left = `${(window.outerWidth / 2) - send.clientWidth}px`.replace("-", '')
// }
// repos()

// window.addEventListener("resize", repos)

window.selector.addDataListener((data) => {
    let videos = ""
    _internal = data
    title.innerText = data.title
    title.href = data.url
    videos += '<div>'
    for (let i = 0; i < data.list.length; i++) {
        let vid = data.list[i]
        // <label for="${i}">
        videos += `    \n<input type="checkbox" id="${i}" checked />
    <img src="${vid.query.bestThumbnail.url}" />
    <a href="${vid.query.url}">${vid.title}</a>
    <br>`
    }
    videos += "\n</div>"
    list.innerHTML = videos
})
window.selector.addResultListener((resp) => {
    alert(resp)
})

let submitFunc = () => {
    let items = []
    for (let i = 0; i < _internal.list.length; i++) {
        //@ts-ignore
        let item: HTMLInputElement = document.getElementById(`${i}`)
        if (item.checked) {
            items.push(_internal.list[ i ])
        }
    }
    window.selector.sendToDL(items, _internal.audioOnly, _internal.removeExtras, _internal.title)
    list.innerHTML = ""
    title.innerHTML = ""
}

send.addEventListener("click", submitFunc)
send2.addEventListener("click", submitFunc)
