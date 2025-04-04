import * as react from "react"
import utils from  "./utils"
import Video from "./components/video"
import moon_stars from "../bootstrap-icons-1.11.1/moon-stars.svg"
import sun_fill from "../bootstrap-icons-1.11.1/sun-fill.svg"
import close from "../bootstrap-icons-1.11.1/x-circle.svg"
import VideoProgress from "./components/video_progress"
import {Modal} from 'bootstrap'

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
    let [audio_only, set_audio_only] = react.useState(false)
    let [reverse_pl, set_reverse_pl] = react.useState(false)
    let [refresh, set_refresh] = react.useState(0)
    let [url, set_url] = react.useState('')
    let [temp_config, set_temp_config] = react.useState<program_config | undefined>()
    let [config, set_config] = react.useState<program_config | undefined>()
    let [cookies_valid, set_cookies_valid] = react.useState(true)
    let [regex, set_regex] = react.useState('')
    let [regex_test, set_regex_test] = react.useState('')
    let [config_modal, set_config_modal] = react.useState<Modal>()
    let [start_index, set_start_index] = react.useState(0)
    let [valid, set_valid] = react.useState(false)
    let [isPL, set_isPL] = react.useState(false)
    let link = react.useRef<HTMLInputElement>(null)
    let dl = react.useRef<HTMLInputElement>(null)
    let proc = react.useRef<HTMLInputElement>(null)
    let logs = react.useRef<HTMLTextAreaElement>(null)
    let err = react.useRef<HTMLTextAreaElement>(null)
    let pl_range_start = react.useRef<HTMLInputElement>(null)
    let pl_range_end = react.useRef<HTMLInputElement>(null)
    // let regex_tester = react.useRef<HTMLInputElement>(null)
    // let regex_result = react.useRef<HTMLInputElement>(null)
    // let regex_flags = react.useRef<HTMLSelectElement>(null)
    let update_bar = react.useRef<HTMLProgressElement>(null)
    let check = react.useRef<HTMLTextAreaElement>(null)
    let color_mode = react.useRef<HTMLImageElement>(null)
    let config_modal_ref = react.useRef<HTMLDivElement>(null)
    let output = react.useRef<HTMLInputElement>(null)
    // let regex = react.useRef<HTMLInputElement>(null)
    // let audio_format = react.useRef<HTMLInputElement>(null)
    // let video_format = react.useRef<HTMLInputElement>(null)
    // let cookies = react.useRef<HTMLTextAreaElement>(null)
    // let cbs: {[key: string]: Parameters<Required<import('./components/video_progress').props>['cbs']>[0]} = {}
    
    if (!config_modal && config_modal_ref.current) {
        set_config_modal(new Modal(config_modal_ref.current!, {

        }))
    }

    let sendReq = () => {
        let regex_list = regex.replace(/\/([^/]+)\/([a-z])?,?/g, '$1\\,$2').split(' ')
        if (valid && isPL) {
            // let regex = regexp.value.split(",")
            window.api.plRequest(url, reverse_pl, regex_list, pl_range_start.current!.valueAsNumber, pl_range_end.current!.valueAsNumber)
        } else if (valid) {
            window.api.downloadVid(url, audio_only, regex_list)
        } else {
            alert("Not a valid yt link")
        }
        set_url("")
        link.current!.value = ""
    }

    let onInput = async (e: react.FormEvent<HTMLInputElement>) => {
        let url = e.currentTarget.value
        set_url(e.currentTarget.value)
        if (!url) {
            check.current!.style.backgroundColor = ''
            // reverse.current!.disabled = true
            // submit.current!.disabled = true
            pl_range_start.current!.hidden = true
            pl_range_end.current!.hidden = true
            set_valid(false)
            return
        }
        try {
            new URL(url)
            let _valid = await window.api.valid(url)
            check.current!.style.backgroundColor = "green"
            if (!_valid) {
                check.current!.style.backgroundColor = "yellow"
                // reverse.current!.disabled = true
                // submit.current!.disabled = true
                pl_range_start.current!.hidden = true
                pl_range_end.current!.hidden = true
                set_valid(false)
                set_isPL( false)
                return
            }
            set_valid(true)
            // submit.current!.disabled = false
            set_isPL(_valid == 'pl')
            pl_range_start.current!.hidden = 
            pl_range_end.current!.hidden =
            !(isPL = _valid == 'pl')
            // reverse.current!.disabled = 
            check.current!.style.backgroundColor = _valid == 'pl' ? "aqua" : 'green'
            
        } catch (err) {
            // submit.current!.disabled = true
            // reverse.current!.disabled = true
            pl_range_start.current!.hidden = true
            pl_range_end.current!.hidden = true
            check.current!.style.backgroundColor = "red"
            set_valid(false)
        }
    }

    let onRangeInput = async () => {
        let start_range = pl_range_start.current!.valueAsNumber;
        let end_range = pl_range_end.current!.valueAsNumber;
        let start_valid = (pl_range_start.current!.valueAsNumber > 1 && (start_range <= end_range || end_range == -1)) || start_range == -1
        let end_valid = end_range > start_range || end_range == -1
        pl_range_start.current!.style.backgroundColor = start_valid ? "" : "red"
        pl_range_end.current!.style.backgroundColor = end_valid ? "" : "red"
        set_valid(start_valid && end_valid)
        // submit.current!.disabled = !valid
    }

    let regexTest = () => {
        // let expressions = regex.current!.value.split(/[gi]?, ?/).filter(s => s.match(/^\/[^/]+\/$/))
        let expressions = regex.replace(/\/([^/]+)\/([a-z])?,?/g, '$1\\,$2').split(' ')
        let value = regex_test
        for (let expression of expressions) {
            let e = expression.split('\\,')
            try {
                value = value.replace(new RegExp(e[0], e[1]), '')
                // value = value.replace(new RegExp(expression.replace(/^\//, '').replace(/\/$/, ''), regex_flags.current!.value), '')
            } catch (err) { /* console.error(err) */ }
        }
        return value
    }

    let onPlDlClick = () => {
        window.api.downloadPl(video_list, audio_only, current_list.title, start_index)
        set_tab(0)
        //@ts-ignore
        set_list({})
        set_videos([])
        set_start_index(0)
        // set_audio_only(false)
    }

    react.useEffect(() => {
        (async() => {
            let c = await window.api.getConfig();
            set_temp_config(c)
            set_config(c)
        })()
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
            set_start_index(data.start_index)
            // set_ao(audio.current!.checked)
        })

        window.api.theme().then(theme => {
            color_mode.current!.src = theme == "dark" ? moon_stars : sun_fill
            color_mode.current!.style.filter = theme == "dark" ? 'invert(100%)' : ''
        })
        
        // submit.current!.disabled = true

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
                    return
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
        return () => {
            window.api.setProgressListener(() => null)
        }
    }, [refresh])

    let main: JSX.Element = <></>

    switch (selected_tab) {
        case 0: {
            main = <>
                <div className="col">
                        <div className="input-group">
                            <span className="input-group-text">Enter Link Here</span>
                            <input ref={link} title='url' type="url" autoFocus required className="form-control" onInput={onInput} onKeyDown={e => {
                                if (e.key == "Enter" || e.code == "Enter") {
                                    sendReq()
                                }
                            }} />
                            <textarea title="status" ref={check} readOnly cols={1} rows={1} style={{ pointerEvents: "none", margin: 0 }} />
                        </div>
                    {/* <div className="url_div">
                        <p>Enter Link Here:</p>
                        <div className="row center_items">
                            <input type="url" ref={url} autoFocus required title="url" onInput={onInput} onKeyDown={e => {
                                if (e.key == "Enter" || e.code == "Enter") {
                                    sendReq()
                                }
                            }} />
                            <textarea title="status" ref={check} readOnly cols={1} rows={1} style={{pointerEvents: "none"}}/>
                        </div>
                    </div> */}
                    <div className="input-group btn-group">
                        <span className="input-group-text">Audio Only</span>
                        <button /* type="checkbox" */ className={`form-control btn btn-${audio_only ? 'success' : 'danger'}`} onClick={() => set_audio_only(!audio_only)}>{audio_only ? 'Enabled' : 'Disabled'}</button>
                        <span className="input-group-text">Reverse</span>
                        <button /*ref={reverse}*/ /* type="checkbox" */ className={`form-control btn btn-${reverse_pl ? 'success' : 'danger'}`} onClick={() => {set_reverse_pl(!reverse_pl); console.log("hi")}} disabled={!isPL}>{reverse_pl ? 'Enabled' : 'Disabled'}</button>
                    </div>
                    {/* <div className="options">
                         <div className="row center_items" style={{ marginBottom: 0 }}>
                            <label htmlFor="audio">Audio Only: </label>
                            <input type="checkbox" id="audio" ref={audio} />
                        </div>
                        <div className="row center_items" style={{marginBottom: 0}}>
                            <label htmlFor="reverse">Reverse Playlist: </label>
                            <input type="checkbox" id="reverse" ref={reverse} disabled />
                        </div>
                    </div> */}
                    <div className="input-group">
                        <span className="input-group-text"><a className="link-info" href="https://www.regular-expressions.info/tutorial.html">Custom RegExp</a></span>
                        <input className="form-control" type="text" id="custom_regexp" title="_test" onInput={v => set_regex(v.currentTarget.value)} />
                        {/* <select className="form-select" id="regexp_flags" ref={regex_flags} title="flags" style={{width: 'unset', flex: 'unset'}} onChange={onRegexTest}>
                            <option value=""></option>
                            <option value="g">g</option>
                            <option value="i">i</option>
                            <option value="y">y</option>
                            <option value="u">u</option>
                        </select> */}
                    </div>
                    {/* <div className="row center_items" style={{justifyContent: "space-around"}}>
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
                    </div> */}
                    <div className="input-group">
                        <span className="input-group-text">Test Regex</span>
                        <input className="form-control" type="text" title="regexp_test" onInput={e => set_regex_test(e.currentTarget.value)} />
                        <input className="form-control" type="text" title="regexp_result" value={regexTest()} readOnly style={{ pointerEvents: "none" }} />
                    </div>
                    {/* <div className="row center_items">
                        <label htmlFor="regexp_test"><pre>Test </pre></label>
                        <input type="text" title="regexp_test" ref={regex_tester} onInput={onRegexTest} />
                        <input type="text" title="regexp_result" ref={regex_result} readOnly style={{ pointerEvents: "none" }} />
                    </div> */}
                    <div className="input-group btn-group">
                        <span className="input-group-text">Range</span>
                        <input className="form-control" hidden type="number" ref={pl_range_start} defaultValue={-1} onInput={onRangeInput} title="playlist start" />
                        <input className="form-control btn btn-primary" type="button" /*ref={submit}*/ value="submit" size={50} onClick={sendReq} disabled={!valid}/>
                        <input className="form-control" hidden type="number" ref={pl_range_end} defaultValue={-1} onInput={onRangeInput} title="playlist end"/>
                        {/* {isPL ? <>
                        </> : <></>} */}
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
                if (start_index != -1) {
                    main = <p>Invalid Range for Playlist</p>
                    break
                }
                main = <p>No playlist selected</p>
                break;
            }
            let videos: JSX.Element[] = []
            let id = start_index;
            for (let video of video_list) {
                videos.push(<Video key={id} data={{...video.query, title: video.title, eid: id++}} clickDelete={e => {
                    set_videos(video_list.filter(e => e.title != video.title))
                }}/>)
            }
            // video_list[0].query.
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
        <div ref={config_modal_ref} data-bs-backdrop="static" className="modal fade" tabIndex={-1} aria-labelledby="configModalLabel" aria-hidden="true">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h1 className="modal-title" id="configModalLabel">Settings</h1>
                    </div>
                    <div className="modal-body" style={{overflow: 'auto'}}>
                        <div className="input-group btn-group">
                            <span className="input-group-text">Output</span>
                            <input ref={output} type="text" className="form-control" defaultValue={temp_config?.output} />
                            <button className="form-control btn btn-secondary" onClick={async (e) => set_temp_config({...temp_config!, output: output.current!.value = await window.api.selectOutput()})}>Browse</button>
                        </div>
                        <div className="input-group">
                            <span className="input-group-text">Audio File Type</span>
                            <select className="form-select" value={temp_config?.audio_format} onChange={e => set_temp_config({...temp_config!, audio_format: e.currentTarget.value as program_config['audio_format']})}>
                                <option value="flac">flac</option>
                                <option value="mp3">mp3</option>
                                <option value="aac">aac</option>
                                <option value="opus">opus</option>
                                <option value="pcm_f32le">pcm_f32le</option>
                                <option value="pcm_f16le">pcm_f16le</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <span className="input-group-text">Video File Type</span>
                            <select className="form-select" value={temp_config?.video_format} onChange={e => set_temp_config({ ...temp_config!, video_format: e.currentTarget.value as program_config['video_format'] })}>
                                <option value="av1">av1</option>
                                <option value="mkv">mkv</option>
                                <option value="webp">webp</option>
                                <option value="mp4">mp4</option>
                                <option value="flv">flv</option>
                            </select>
                        </div>
                        <div style={{display: 'flex', flexDirection: "column"}}>
                            <p>Cookies</p>
                            <p> (Will allow you to download your private video and age restricted)</p>
                            <textarea defaultValue={JSON.stringify(temp_config?.cookies, null, 4)} onChange={e => {
                                try {
                                    if (!e.currentTarget.value) {
                                        //@ts-ignore
                                        set_temp_config({...temp_config, cookies: []})
                                        set_cookies_valid(true)
                                        return
                                    }
                                    let cookies = JSON.parse(e.currentTarget.value)
                                    if (!Array.isArray(cookies)) {
                                        throw ""
                                    }
                                    if (!cookies.every(v => 
                                        typeof v.name == 'string' &&
                                        typeof v.value == 'string' &&
                                        typeof v.expirationDate == 'number' &&
                                        typeof v.domain == 'string' &&
                                        typeof v.path == 'string' &&
                                        typeof v.secure == "boolean" &&
                                        typeof v.httpOnly == 'boolean' &&
                                        typeof v.hostOnly == 'boolean' &&
                                        typeof v.sameSite == 'string'
                                    )) {
                                        throw ""
                                    }
                                    set_temp_config({ ...temp_config!, cookies})
                                    set_cookies_valid(true)
                                } catch {
                                    set_cookies_valid(false)
                                }
                            }} wrap="off" style={{flexGrow: 1, height: '150px', textAlign: 'left'}}></textarea>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={() => { set_temp_config({ ...config! }); config_modal!.hide();}}>Cancel</button>
                        <button type="button" className="btn btn-primary" disabled={!cookies_valid} onClick={() => { set_config({ ...temp_config! }); window.api.setConfig(temp_config!); config_modal!.hide(); }}>Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
        <header>
            <div>
                {/* <input type="button" value="Select Output Location" onClick={window.api.selectOutput} /> */}
                <input type="button" value="Open Settings" onClick={() => {
                    config_modal?.show()
                }} />
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
