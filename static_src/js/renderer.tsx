import * as react from "react"
import Page  from "./index"
import * as dom from "react-dom/client"
import baseStyle from "../css/base.scss"
import utils from "./utils"

let root: dom.Root
utils.loadTheme()

if (module.hot) {
    root = module.hot?.data?.root || dom.createRoot(document.getElementById("root")!)
    module.hot.addDisposeHandler((data) => {
        data.root = root
    })
    module.hot.accept()
} else {
    root = dom.createRoot(document.getElementById("root")!)
}

document.adoptedStyleSheets = [baseStyle]

root.render(<react.StrictMode>
    <Page />
</react.StrictMode>)
