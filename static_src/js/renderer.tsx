import react = require("react")
import Page = require("./index")
import dom = require("react-dom/client")
import baseStyle = require("../css/base.scss")
import utils = require("./utils")

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

document.adoptedStyleSheets = [baseStyle.default]

root.render(<react.StrictMode>
    <Page />
</react.StrictMode>)
