import react = require("react")
import utils = require("./utils")
import Video = require("./components/video")
let valid = false
let isPL = false

let page = () => {
    let [selected_tab, set_tab] = react.useState(0)
    //@ts-ignore
    let [current_list, set_list] = react.useState<{ items: { title: string, query: import("ytpl").Item }[], title: string, url: string }>({})
    let [video_list, set_videos] = react.useState<typeof current_list["items"]>([])
    let [audioOnly, set_ao] = react.useState(false)
    let url = react.useRef<HTMLInputElement>(null)
    let audio = react.useRef<HTMLInputElement>(null)
    let reverse = react.useRef<HTMLInputElement>(null)
    let submit = react.useRef<HTMLInputElement>(null)
    let dl = react.useRef<HTMLInputElement>(null)
    let proc = react.useRef<HTMLInputElement>(null)
    let logs = react.useRef<HTMLTextAreaElement>(null)
    let err = react.useRef<HTMLTextAreaElement>(null)
    let regex = react.useRef<HTMLInputElement>(null)
    let regex_tester = react.useRef<HTMLInputElement>(null)
    let regex_result = react.useRef<HTMLInputElement>(null)
    let regex_flags = react.useRef<HTMLSelectElement>(null)
    let progressBar = react.useRef<HTMLProgressElement>(null)
    let check = react.useRef<HTMLTextAreaElement>(null)
    let color_mode = react.useRef<HTMLElement>(null)

    let sendReq = () => {
        if (valid && isPL) {
            // let regex = regexp.value.split(",")
            window.api.plRequest(url.current!.value, reverse.current!.checked, regex.current!.value.split(/, ?/).filter(s => s.match(/^\/[^/]+\/$/)))
        } else if (valid) {
            window.api.downloadVid(url.current!.value, audio.current!.checked, regex.current!.value.split(/, ?/).filter(s => s.match(/^\/[^/]+\/$/)))
        } else {
            alert("Not a valid yt link")
        }
    }

    let onInput = async () => {
        try {
            new URL(url.current!.value)
            check.current!.style.backgroundColor = "green"
            if (!(await window.api.valid(url.current!.value))) {
                check.current!.style.backgroundColor = "yellow"
                reverse.current!.disabled = true
                submit.current!.disabled = true
                valid = false
                isPL = false
            } else if (await window.api.valid(url.current!.value) == "pl") {
                check.current!.style.backgroundColor = "green"
                reverse.current!.disabled = false
                submit.current!.disabled = false
                isPL = true
                valid = true
            } else {
                isPL = false
                check.current!.style.backgroundColor = "green"
                reverse.current!.disabled = true
                submit.current!.disabled = false
                valid = true
            }
        } catch (err) {
            submit.current!.disabled = true
            reverse.current!.disabled = true
            check.current!.style.backgroundColor = "red"
            valid = false
            // console.log(err)
        }
    }

    let onRegexTest = () => {
        let expressions = regex.current!.value.split(/[gi]?, ?/).filter(s => s.match(/^\/[^/]+\/$/))
        let value = regex_tester.current!.value
        for (let expression of expressions) {
            try {
                value = value.replace(new RegExp(expression.replace(/^\//, '').replace(/\/$/, ''), regex_flags.current!.value), '')
            } catch (err) { /* console.error(err) */ }
        }
        regex_result.current!.value = value
    }

    let onPlDlClick = () => {
        window.api.downloadPl(video_list, audioOnly, current_list.title)
        set_tab(0)
        //@ts-ignore
        set_list({})
        set_videos([])
        set_ao(false)
    }

    react.useEffect(() => {
        window.api.setLogListener((data) => {
            // alert(data)
            logs.current!.value += `${data}\n`
        })

        window.api.setErrorListener(data => {
            err.current!.value += `${data}\n`
        })

        window.api.setDLListener(_info => {
            let info: {
                total: number
                delta: number
                transferred: number
                /**out of 100 (float) */
                percent: number
                bytesPerSecond: number
            } = JSON.parse(_info)
            progressBar.current!.style.display = "inline-block"
            progressBar.current!.value = info.percent
        })

        window.api.setPLListener(data => {
            set_list(data)
            set_tab(1)
            set_videos([...data.items])
            set_ao(audio.current!.checked)
        })

        window.api.theme().then(theme => {
            color_mode.current!.className = `bi ${theme == "dark" ? "bi-moon-stars" : "bi-sun-fill"}`
        })

        submit.current!.disabled = true

    }, [])

    let main: JSX.Element = <></>

    switch (selected_tab) {
        case 0: {
            main = <>
                <div className="col">
                    <div className="url_div">
                        <a>Enter Link Here </a>
                        <input type="url" ref={url} autoFocus required title="_test" onInput={onInput} onKeyDown={e => {
                            if (e.key == "Enter" || e.code == "Enter") {
                                sendReq()
                            }
                        }} />
                        <textarea title="status" ref={check} readOnly cols={1} rows={1} style={{pointerEvents: "none"}}/>
                    </div>
                    <div className="options">
                        <label htmlFor="audio">Audio Only</label>
                        <input type="checkbox" id="audio" ref={audio} />
                        <label htmlFor="reverse">Reverse Playlist</label>
                        <input type="checkbox" id="reverse" ref={reverse} disabled />
                    </div>
                    <div>
                        <label htmlFor="custon_regexp">
                            <a className="link-info" href="https://www.regular-expressions.info/tutorial.html">Custom RegExp</a>
                        </label>
                        <input type="text" id="custom_regexp" ref={regex} title="_test" onInput={onRegexTest} />
                        <select id="regexp_flags" ref={regex_flags} title="flags">
                            <option value=""></option>
                            <option value="g">g</option>
                            <option value="i">i</option>
                            <option value="y">y</option>
                            <option value="u">u</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="regexp_test"><pre>Test </pre></label>
                        <input type="text" title="regexp_test" ref={regex_tester} onInput={onRegexTest} />
                        <input type="text" title="regexp_result" ref={regex_result} readOnly style={{ pointerEvents: "none" }} />
                    </div>
                    <div>
                        <input type="button" ref={submit} value="submit" size={50} onMouseDown={sendReq} />
                    </div>
                </div>
                <div className="row center_items">
                    <textarea title="_test" id="logs" readOnly wrap="soft" className="log" style={{ cursor: "context-menu" }} />
                    <textarea title="_test" id="errors" readOnly wrap="soft" className="log" style={{ cursor: "context-menu" }} />
                </div>
            </>
            break;
        }
        case 1: {
            if (video_list.length < 1) {
                main = <p>No playlist selected</p>
                break;
            }
            let videos: JSX.Element[] = []
            let id = 0;
            for (let video of video_list) {
                videos.push(<Video data={{...video.query, title: video.title, eid: id++}} clickDelete={e => {
                    set_videos(video_list.filter(e => e.title != video.title))
                }}/>)
            }
            main = <div className="col center_items" style={{width: "100%"}}>
                <h3><a className="link-info" href={current_list.url}>{current_list.title}</a></h3>
                <input value={"Download"} title="download" onClick={onPlDlClick} type="button" />
                {videos}
                <input value={"Download"} title="download" onClick={onPlDlClick} type="button" />
            </div>
            break;
        }
        default: {
            set_tab(0)
        }
    }

    return <>
        <header>
            <div>
                <input type="button" value="Select Output Location" onClick={window.api.selectOutput} />
                <span><i className='bi' ref={color_mode} style={{marginLeft: "10px", cursor: "pointer"}} onClick={async e => {
                    let theme = (await utils.loadTheme()) == "dark" ? "light" : "dark"
                    utils.setTheme(theme)
                    color_mode.current!.className = `bi ${theme == "dark" ? "bi-moon-stars" : "bi-sun-fill"}`
                }}/></span>
            </div>
            <div>
                <button className="btn btn-primary" onClick={() => set_tab(0)}>Main Page</button>
                <button className="btn btn-secondary" onClick={() => set_tab(1)}>Playlist Modifier</button>
            </div>
            <div className="col">
                <div className="row">
                    <label htmlFor="dl" style={{marginRight: "20px"}}>Limit Download</label>
                    <label htmlFor="proc">Limit Processing</label>
                </div>
                <div className="row" style={{justifyContent: "space-around"}}>
                    <input type="text" defaultValue="5" id="dl" className="small_number" />
                    <input type="text" defaultValue="5" id="proc" className="small_number" />
                </div>
                <div className="row center_items">
                    <input type="button" value="Change" onClick={async () => {
                        logs.current!.value += await window.api.concurrency(dl.current!.value, proc.current!.value)
                    }}/>
                </div>
            </div>
        </header>
        <main>
            {main}
        </main>
        <div>
            <footer>
                <progress id="dl-bar" max="100" value="0" style={{display: "none"}}></progress>
            </footer>
        </div>
    </>
}
                
export = page
