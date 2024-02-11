declare module "*.css" {
    export default CSSStyleSheet.prototype
}

declare module "*.scss" {
    export default CSSStyleSheet.prototype
}

declare module "*.svg" {
    let _string: string
    export default _string
}

