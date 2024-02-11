import * as react from "react"
import trash_icon from "../../bootstrap-icons-1.11.1/trash.svg"

type props = {
    data: import('ytpl').Item & { eid: number },
    clickDelete?: react.MouseEventHandler,
}
export default ({ data, clickDelete }: props) => {
    
    let img = react.useRef<HTMLImageElement>(null)
    
    // Lazy load the images from youtube instead of loading them all at once
    react.useEffect(() => {
        let observer = new IntersectionObserver(e => {
            e.forEach(entry => {
                if (!entry.isIntersecting) {
                    return;
                }
                img.current!.src = data.bestThumbnail.url || data.thumbnails[0].url!
                observer.disconnect()
                //@ts-ignore
                observer = null;
            })
        })
        observer.observe(document.getElementById(`card_${data.eid}`)!)
        return () => {
            if (observer) {
                observer.disconnect()
            }
        }
        
    })
    
    return <div className="card" style={{width: '90%'}}>
        <div className="row" style={{justifyContent: "space-between"}}>
            <div className="row center_items" style={{justifyContent: 'flex-start'}}>
                <img style={{width: 128, height: 72}} ref={img} id={`card_${data.eid}`} title="video_img"/>
                <div className="col">
                    <div className="card-body">
                        <h5 className="card-title">{data.eid + 1}. <a href={data.url} className="link-info">{data.title}</a></h5>
                        <a href={data.author.url}><h6 className="card-subtitle link-info">{data.author.name}</h6></a>
                    </div>
                </div>
            </div>
            <div className="col" style={{justifyContent: "flex-end"}}>
                <button className="btn btn-outline-danger" onClick={clickDelete} aria-label="Delete"><img src={trash_icon} title="Delete"/></button>
            </div>
        </div>
    </div>

}
