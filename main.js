let Module = require("module")
let orequire = Module.prototype.require;

Module.prototype.require = function() {
    if (arguments[0] == "fs") {
        return orequire.apply(this, ["path"])
    }
    return orequire.apply(this, arguments)
}

let fs = require("fs")
console.log("Hello World")
