import * as react from "react"
import utils from  "./utils"
import Video from "./components/video"
import moon_stars from "../bootstrap-icons-1.11.1/moon-stars.svg"
import sun_fill from "../bootstrap-icons-1.11.1/sun-fill.svg"
import VideoProgress from "./components/video_progress"

let valid = false
let isPL = false
let logs_list: string[] = []
let errors_list: string[] = []

let progress_list: {[key: string]: {
    dl_a_max: number
    dl_v_max: number
    dl_a_cur: number,
    dl_v_cur: number,
    proc_max: number
    proc_cur: number,
}} = {}
// TODO: Collapsable progress bars
//TODO: Modify most refs to states
const page = () => {
    let [selected_tab, set_tab] = react.useState(0)
    //@ts-ignore
    let [current_list, set_list] = react.useState<{ items: { title: string, query: import("ytpl").Item }[], title: string, url: string }>({})
    let [video_list, set_videos] = react.useState<typeof current_list["items"]>([])
    let [audioOnly, set_ao] = react.useState(false)
    let [refresh, set_refresh] = react.useState(0)
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
    let update_bar = react.useRef<HTMLProgressElement>(null)
    let check = react.useRef<HTMLTextAreaElement>(null)
    let color_mode = react.useRef<HTMLImageElement>(null)

    // let cbs: {[key: string]: Parameters<Required<import('./components/video_progress').props>['cbs']>[0]} = {}
    
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
            let _valid = await window.api.valid(url.current!.value)
            check.current!.style.backgroundColor = "green"
            if (!_valid) {
                check.current!.style.backgroundColor = "yellow"
                reverse.current!.disabled = true
                submit.current!.disabled = true
                valid = false
                isPL = false
                return
            }
            valid = true
            submit.current!.disabled = false
            reverse.current!.disabled = !(isPL = _valid == 'pl')
            check.current!.style.backgroundColor = _valid == 'pl' ? "aqua" : 'green'
        } catch (err) {
            submit.current!.disabled = true
            reverse.current!.disabled = true
            check.current!.style.backgroundColor = "red"
            valid = false
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
            logs_list.push(data)
            if (selected_tab == 0) {
                logs.current!.value += `${data}\n`
            }
        })

        window.api.setErrorListener(data => {
            errors_list.push(data)
            if (selected_tab == 0) {
                err.current!.value += `${data}\n`
            }
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
            update_bar.current!.style.display = "inline-block"
            update_bar.current!.value = info.percent
        })

        window.api.setPLListener(data => {
            set_list(data)
            set_tab(1)
            set_videos([...data.items])
            set_ao(audio.current!.checked)
        })

        window.api.theme().then(theme => {
            color_mode.current!.src = theme == "dark" ? moon_stars : sun_fill
            color_mode.current!.style.filter = theme == "dark" ? 'invert(100%)' : ''
        })


        submit.current!.disabled = true

    }, [])

    react.useEffect(() => {
        window.api.setProgressListener((title, type, value, max, dl_type) => {
            // let refresh = false
            // if (!progress_list[title]) {
                // refresh = true
                // }
            set_refresh(refresh + 1)
            // @ts-ignore
            progress_list[title] ??= {}
            if (type == 'process') {
                if (value == max) {
                    delete progress_list[title]
                }
                progress_list[title].proc_cur = value
                progress_list[title].proc_max = max
                return
            }
            if (dl_type == 'audio') {
                progress_list[title].dl_a_cur = value
                progress_list[title].dl_a_max = max
                return
            }
            progress_list[title].dl_v_cur = value
            progress_list[title].dl_v_max = max
        })
        return () => window.api.setProgressListener(() => null)
    }, [refresh])

    let main: JSX.Element = <></>

    switch (selected_tab) {
        case 0: {
            main = <>
                <div className="col">
                    <div className="url_div">
                        <p>Enter Link Here:</p>
                        <div className="row center_items">
                            <input type="url" ref={url} autoFocus required title="url" onInput={onInput} onKeyDown={e => {
                                if (e.key == "Enter" || e.code == "Enter") {
                                    sendReq()
                                }
                            }} />
                            <textarea title="status" ref={check} readOnly cols={1} rows={1} style={{pointerEvents: "none"}}/>
                        </div>
                    </div>
                    <div className="options">
                        <div className="row center_items" style={{ marginBottom: 0 }}>
                            <label htmlFor="audio">Audio Only: </label>
                            <input type="checkbox" id="audio" ref={audio} />
                        </div>
                        <div className="row center_items" style={{marginBottom: 0}}>
                            <label htmlFor="reverse">Reverse Playlist: </label>
                            <input type="checkbox" id="reverse" ref={reverse} disabled />
                        </div>
                    </div>
                    <div className="row center_items" style={{justifyContent: "space-around"}}>
                        <label htmlFor="custon_regexp">
                            <a className="link-info" href="https://www.regular-expressions.info/tutorial.html">Custom RegExp</a>
                        </label>
                        <div>
                            <input type="text" id="custom_regexp" ref={regex} title="_test" onInput={onRegexTest} />
                            <select id="regexp_flags" ref={regex_flags} title="flags">
                                <option value=""></option>
                                <option value="g">g</option>
                                <option value="i">i</option>
                                <option value="y">y</option>
                                <option value="u">u</option>
                            </select>
                        </div>
                    </div>
                    <div className="row center_items">
                        <label htmlFor="regexp_test"><pre>Test </pre></label>
                        <input type="text" title="regexp_test" ref={regex_tester} onInput={onRegexTest} />
                        <input type="text" title="regexp_result" ref={regex_result} readOnly style={{ pointerEvents: "none" }} />
                    </div>
                    <div>
                        <input type="button" ref={submit} value="submit" size={50} onClick={sendReq} />
                    </div>
                </div>
                <div className="row center_items">
                    <textarea title="_test" id="logs" readOnly wrap="soft" className="log" style={{ cursor: "context-menu" }} ref={logs} value={logs_list.join("\n") + "\n"}/>
                    <textarea title="_test" id="errors" readOnly wrap="soft" className="log" style={{ cursor: "context-menu" }} ref={err} value={errors_list.join("\n") + "\n"}/>
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
                videos.push(<Video key={id} data={{...video.query, title: video.title, eid: id++}} clickDelete={e => {
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
                <img title="theme select" ref={color_mode} style={{marginLeft: "10px", cursor: "pointer", verticalAlign: 'middle'}} onClick={async _e => {
                    let theme = (await utils.loadTheme()) == "dark" ? "light" : "dark"
                    utils.setTheme(theme)
                    color_mode.current!.src = theme == "dark" ? moon_stars : sun_fill
                    color_mode.current!.style.filter = theme == "dark" ? 'invert(100%)' : ''
                }}/>
            </div>
            <div className="progress">
                {Object.entries(progress_list).map(v => {
                    let info = v[1]
                    if (info.proc_cur > 0) {
                        return <VideoProgress key={v[0]} init={info.proc_cur} max={info.proc_max} title={v[0]} /* cbs={(sv) => cbs[v[0]] = sv} */ alt />
                    }
                    return <VideoProgress key={v[0]} init={(info.dl_a_cur || 0) + (info.dl_v_cur || 0)} max={(info.dl_a_max || 0) + (info.dl_v_cur || 0)} title={v[0]} /* cbs={(sv) => cbs[v[0]] = sv} */ />
                })}
                {/* <VideoProgress title="Hello World" download_max={100} process_max={100} cbs={(d, p) => setTimeout(() => p(50))}/> */}
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
                    <input type="text" defaultValue="5" id="dl" ref={dl} className="small_number" />
                    <input type="text" defaultValue="5" id="proc" ref={proc} className="small_number" />
                </div>
                <div className="row center_items">
                    <input type="button" value="Change" onClick={async () => {
                        let value = await window.api.concurrency(dl.current!.value, proc.current!.value)
                        logs_list.push(value)
                        if (selected_tab == 0) {
                            logs.current!.value += `${value}\n`
                        }
                    }}/>
                </div>

            </div>
        </header>
        <main>
            {main}
        </main>
        <div>
            <footer>
                <progress ref={update_bar} max="100" value="0" style={{display: "none"}}></progress>
            </footer>
        </div>
    </>
}
                
export default page
