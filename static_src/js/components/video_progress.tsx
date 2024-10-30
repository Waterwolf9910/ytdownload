import * as react from "react";

export type props = {
    title: string;
    max: number;
    init?: number;
    alt?: boolean;
    // cbs?: (set_value: (dl: number) => void) => void;
}

export default ({title, max, init, alt}: props) => {
    // let [value, set_value] = react.useState(init || 0)
    
    // if (cbs) {
    //     cbs(set_value)
    // }

    return <div>
        <p>{title}</p> <progress style={{ accentColor: alt ? '#1c6beb' : 'lime'}} max={max} value={init} />
    </div>
}
