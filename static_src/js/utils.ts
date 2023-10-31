// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
let bootstrap: typeof import("bootstrap") = undefined

// Lazy load bootstrap
require.ensure([], require => {
    bootstrap = require("bootstrap/dist/js/bootstrap.esm.min.js")
})

let renderError = (content: string, ref: import('react').RefObject<HTMLElement>) => {
    let popover = new bootstrap.Popover(ref.current!, {
        animation: true,
        delay: 500,
        placement: "bottom",
        title: "Error",
        content,
    })
    popover.show()
    let inv = setTimeout(() => {
        popover.dispose()
        clearInterval(inv)
    }, 2500)
}

let cached_theme: string
export = {
    setTheme: async (theme: string) => {
        cached_theme = await window.api.theme(theme)
        document.documentElement.setAttribute("data-bs-theme", theme)
    },
    loadTheme: async () => {
        if (!cached_theme) {
            cached_theme = await window.api.theme() ?? "dark";
        }
        document.documentElement.setAttribute("data-bs-theme", cached_theme)
        return cached_theme
    },
    renderError,
    get bootstrap() {
        return bootstrap
    },
}
