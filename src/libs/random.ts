// let file = __filename.split(require("path").sep)
// if (require.main === module) {
//     throw new Error(`${file[ file.length - 1 ]} is not supposed to be run directly`)
// }

// class Random {
//     /**
//      * @param {number | string} length How long the randomized string will be
//      * @param {number | string} max_num The max number from 0 to max_num
//      */
//     constructor(length = 25, max_num = 10) {
//         if (isNaN(length)) {
//             throw new SyntaxError(`${length} is not a Number`)
//         }
//         if (isNaN(max_num)) {
//             throw new SyntaxError(`${length} is not a Number`)
//         }
//         // if (typeof length !== "string" && typeof length !== "number") {
//         //     console.log(typeof length)
//         //     throw new TypeError(`${length} is not a string or a number`)
//         // }
//         if (typeof length == "string" ? parseInt(length) : length < 1) {
//             throw new SyntaxError("Length cannot be less then 1")
//         }
//         this.max = max_num ? typeof max_num == "string" ? parseInt(max_num) : max_num : this.max
//         this.length = length ? typeof length == "string" ? parseInt(length) : length : this.length

//     }
//     length: number
//     max: number
//     /**
//      * @param {number | string} length Overrides constructor length
//      * @param {number | string} max Overrides constructro max_num
//      * @returns {string} Returns a {length} long string of random number from 0 to {num}
//      */
//     num(length = this.length, max = this.max) {
//         if (length < 1) {
//             throw new SyntaxError("Length cannot be less then 1")
//         }
//         return new Source(length, max).num()
//     }
//     /**
//      * @param {number | string} length Overrides constructor {length}
//      * @param {boolean} caps Adds random caps to string 
//      * @returns {string} Returns a {length} long string characters
//      */
//     alpha(caps = false, length = this.length) {
//         if (typeof caps !== "boolean") {
//             throw new TypeError(`${caps} is not true or false`)
//         }
//         if (length < 1) {
//             throw new SyntaxError("Length cannot be less then 1")
//         }
//         return new Source(length).letter(caps)
//     }
//     /**
//      * @param {number | string} max sets max number
//      * @param {number | string} min sets min number
//      * @returns {number} Returns a integer within {min} through {max}
//      */
//     singleNum(max, min = 0) {
//         if (max == undefined || max.length < 1) {
//             throw new SyntaxError("Expected 1-2 argument, received 0")
//         }
//         if (max < min) {
//             throw new SyntaxError(`Max cannot be less then Min
//     max: ${max},
//     min: ${min}`)
//         }
//         return new Source().singleNum(max, min)
//     }
//     /**
//      * @param {RegExp | null} exclude Allows excluding certain characters (i.e new RegExp("[;]+"))
//      * @param {number | string} length Overrides constructror max_num
//      * @returns {string} Returns a random special character   
//      */
//     special(exclude = null, length = this.length) {
//         if (length < 1) {
//             throw new SyntaxError("Length cannot be less then 1")
//         }
//         if (exclude !== null && !(exclude instanceof RegExp)) {
//             throw new TypeError(`${exclude} is not null or a instance of RegExp`)
//         }
//         return new Source(length).special(exclude, length)
//     }
//     /**
//      * @param {boolean} caps Adds random caps to string
//      * @param {number | string} length Overrides constructor length
//      * @param {number | string} max Overrides constructror max_num
//      * @returns {string} Returns a {length} long string of letters and numbers 0 through {max}
//      */
//     alphaNum(caps = false, length = this.length, max = this.max) {
//         if (typeof caps !== "boolean") {
//             throw new TypeError(`${caps} is not true or false`)
//         }
//         if (length < 1) {
//             throw new SyntaxError("Length cannot be less then 1")
//         }
//         return new Source(length, max).alphaNum(caps)
//     }
//     /**
//      * @param {RegExp | null} exclude Allows excluding certain characters (i.e new RegExp("[;]+"))
//      * @param {number} length Overrides constructror length
//      * @param {number} max Overrides constructror max_num
//      * @returns {string} Returns a {length} long string of special characters and numbers 0 through {max}
//      */
//     numSpecial(exclude: RegExp = null, length = this.length, max = this.max) {
//         if (exclude !== null && !(exclude instanceof RegExp)) {
//             throw new TypeError(`${exclude} is not null or a instance of RegExp`)
//         }
//         if (length < 1) {
//             throw new SyntaxError("Length cannot be less then 1")
//         }
//         if (max < 0) {
//             throw new SyntaxError(`Max cannot be less then 0
//     max: ${max}`)
//         }
//         return new Source(length, max).numSpecial(exclude)
//     }
//     /**
//      * @param {boolean} caps Adds random caps to string
//      * @param {RegExp | null} exclude Allows excluding certain characters (i.e new RegExp("[;]+"))
//      * @param {number} length Overrides constructror length
//      * @returns {string} Returns a {length} long string of letters and special characters
//      */
//     alphaSpecial(caps = false, exclude: RegExp = null, length = this.length) {
//         if (typeof caps !== "boolean") {
//             throw new TypeError(`${caps} is not true or false`)
//         }
//         if (exclude !== null && !(exclude instanceof RegExp)) {
//             throw new TypeError(`${exclude} is not null or a instance of RegExp`)
//         }
//         return new Source(length).alphaSpecial(caps, exclude)
//     }
//     /**
//      * @param {boolean} caps Adds random caps to string
//      * @param {RegExp} exclude Allows excluding certain characters (i.e new RegExp("[;]+"))
//      * @param {number | string} length Overrides constructror length
//      * @param {number | string} max Overrides constructror max_num
//      * @returns {string} Returns a {length} long string of letters special characters, and numbers 0 through {max}
//      */
//     alphaNumSpecial(caps = false, exclude: RegExp = null, length = this.length, max = this.max) {
//         if (typeof caps !== "boolean") {
//             throw new TypeError(`${caps} is not true or false`)
//         }
//         if (exclude !== null && !(exclude instanceof RegExp)) {
//             throw new TypeError(`${exclude} is not null or a instance of RegExp`)
//         }
//         if (length < 1) {
//             throw new SyntaxError("Length cannot be less then 1")
//         }
//         if (max < 0) {
//             throw new SyntaxError(`Max cannot be less then 0
//     max: ${max}`)
//         }
//         return new Source(length, max).alphaNumSpecial(caps, exclude)
//     }

// }

// class Source {
//     constructor(length = 25, max_num = 10) {
//         this.length = length
//         this.max = max_num
//     }
//     length = 25
//     max = 10
//     num(length = this.length, max = this.max + 1) {
//         let x = ''
//         while (x.length < length) {
//             let y = `${Math.floor(Math.random() * max)}`
//             x += y
//         }
//         while (x.length > length) {
//             x = x.slice(0, -1)
//         }
//         return parseInt(x)
//     }

//     singleNum(max, min) {
//         if (isNaN(max)) {
//             throw new TypeError(`${max} is not a number`)
//         }
//         if (isNaN(max)) {
//             throw new TypeError(`${max} is not a number`)
//         }
//         return Math.floor(Math.random() * (max - min + 1) + min)
//     }
//     letter(caps = false, length = this.length) {
//         let x = '0'
//         let z = () => {
//             let x1: string;
//             let y = this.singleNum(25, 0)
//             switch (y) {
//                 case 0:
//                     x1 = "a"
//                     break
//                 case 1:
//                     x1 = "b"
//                     break
//                 case 2:
//                     x1 = "c"
//                     break
//                 case 3:
//                     x1 = "d"
//                     break
//                 case 4:
//                     x1 = "e"
//                     break
//                 case 5:
//                     x1 = "f"
//                     break
//                 case 6:
//                     x1 = "g"
//                     break
//                 case 7:
//                     x1 = "h"
//                     break
//                 case 8:
//                     x1 = "i"
//                     break
//                 case 9:
//                     x1 = "j"
//                     break
//                 case 10:
//                     x1 = "k"
//                     break
//                 case 11:
//                     x1 = "l"
//                     break
//                 case 12:
//                     x1 = "m"
//                     break
//                 case 13:
//                     x1 = "n"
//                     break
//                 case 14:
//                     x1 = "o"
//                     break
//                 case 15:
//                     x1 = "p"
//                     break
//                 case 16:
//                     x1 = "q"
//                     break
//                 case 17:
//                     x1 = "r"
//                     break
//                 case 18:
//                     x1 = "s"
//                     break
//                 case 19:
//                     x1 = "t"
//                     break
//                 case 20:
//                     x1 = "u"
//                     break
//                 case 21:
//                     x1 = "v"
//                     break
//                 case 22:
//                     x1 = "w"
//                     break
//                 case 23:
//                     x1 = "x"
//                     break
//                 case 24:
//                     x1 = "y"
//                     break
//                 case 25:
//                     x1 = "z"
//                     break
//                 default:
//                     throw new RangeError("Unknown Error getting letter")
//             }
//             return x1
//         }
//         while (x.length < length) {
//             if (caps) {
//                 if (x == '0') {
//                     if (this.singleNum(1, 0) == 1) {
//                         x = z().toUpperCase()
//                     } else {
//                         x = z()
//                     }
//                 } else {
//                     if (this.singleNum(1, 0) == 1) {
//                         x += z().toUpperCase()
//                     } else {
//                         x += z()
//                     }
//                 }
//             } else {
//                 x = z()
//                 // if (x == '0') {
//                 //     x = z()
//                 // } else {
//                 //     x = z()
//                 // }
//             }
//         }
//         if (caps) {
//             let y = this.singleNum(1, 0)
//             if (x == '0') {
//                 if (y == 1) {
//                     x = z().toUpperCase()
//                 } else {
//                     x = z()
//                 }
//             }
//         } else {
//             if (x == '0') {
//                 x = z()
//             }
//         }
//         while (x.length > length) {
//             x = x.slice(0, -1)
//         }
//         return x
//     }
//     special(exclude = null, length = this.length) {
//         let useExclude = false
//         if (exclude !== null) {
//             if (exclude instanceof RegExp) {
//                 useExclude = true
//             } else {
//                 console.warn(`${exclude} is not vaild instance of RegExp`)
//             }
//         }
//         let x = '0'
//         let z = () => {
//             let y = this.singleNum(31, 0)
//             let a
//             switch (y) {
//                 case 0:
//                     a = '`'
//                     break;
//                 case 1:
//                     a = "~"
//                     break
//                 case 2:
//                     a = "!"
//                     break
//                 case 3:
//                     a = "@"
//                     break
//                 case 4:
//                     a = "#"
//                     break
//                 case 5:
//                     a = "$"
//                     break
//                 case 6:
//                     a = "%"
//                     break
//                 case 7:
//                     a = "^"
//                     break
//                 case 8:
//                     a = "&"
//                     break
//                 case 9:
//                     a = "*"
//                     break
//                 case 10:
//                     a = "("
//                     break
//                 case 11:
//                     a = ")"
//                     break
//                 case 12:
//                     a = "-"
//                     break
//                 case 13:
//                     a = "_"
//                     break
//                 case 14:
//                     a = "="
//                     break
//                 case 15:
//                     a = "+"
//                     break
//                 case 16:
//                     a = "["
//                     break
//                 case 17:
//                     a = "{"
//                     break
//                 case 18:
//                     a = "]"
//                     break
//                 case 19:
//                     a = "}"
//                     break
//                 case 20:
//                     a = "\\"
//                     break
//                 case 21:
//                     a = "|"
//                     break
//                 case 22:
//                     a = ";"
//                     break
//                 case 23:
//                     a = ":"
//                     break
//                 case 24:
//                     a = "'"
//                     break
//                 case 25:
//                     a = '"'
//                     break
//                 case 26:
//                     a = ","
//                     break
//                 case 27:
//                     a = "<"
//                     break
//                 case 28:
//                     a = "."
//                     break
//                 case 29:
//                     a = ">"
//                     break
//                 case 30:
//                     a = "/"
//                     break
//                 case 31:
//                     a = "?"
//                     break
//                 default:
//                     throw new RangeError("Unknown Error getting character")
//             }
//             return a
//         }
//         for (null; x.length < length;) {
//             let zx = z()
//             if (useExclude) {
//                 while (zx.match(exclude)) {
//                     zx = zx.replace(zx, z())
//                 }
//                 if (x == '0') {
//                     x = zx
//                 } else {
//                     x += zx
//                 }
//             } else {
//                 if (x == '0') {
//                     x = z()
//                 } else {
//                     x += z()
//                 }
//             }
//         }
//         if (x == '0') {
//             if (useExclude) {
//                 let zx = z()
//                 while (zx.match(exclude)) {
//                     zx = zx.replace(zx, z())
//                 }
//                 x = zx
//             } else {
//                 x = z()
//             }
//         }
//         while (x.length > length) {
//             x = x.slice(0, -1)
//         }
//         return x
//     }
//     alphaNum(cap = false, length = this.length, max = this.max) {
//         let x = '0'
//         for (null; x.length < length;) {
//             if (this.singleNum(1, 0) == 1) {
//                 if (x == '0') {
//                     x = this.letter(cap, 1)
//                 } else {
//                     x += this.letter(cap, 1)
//                 }
//             } else {
//                 if (x == '0') {
//                     x = `${this.singleNum(max, 0)}`
//                 } else {
//                     x += `${this.singleNum(max, 0)}`
//                 }
//             }
//         }
//         while (x.length > length) {
//             x = x.slice(0, -1)
//         }
//         return x
//     }
//     numSpecial(exclude = null, length = this.length, max = this.max) {
//         let x = '0'
//         for (null; x.length < length;) {
//             if (this.singleNum(1, 0) == 1) {
//                 if (x == '0') {
//                     x = `${this.singleNum(max, 0)}`
//                 } else {
//                     x += `${this.singleNum(max, 0)}`
//                 }
//             } else {
//                 if (x == '0') {
//                     x = this.special(exclude, 1)
//                 } else {
//                     x += this.special(exclude, 1)
//                 }
//             }
//         }
//         while (x.length > length) {
//             x = x.slice(0, -1)
//         }
//         return x
//     }
//     alphaSpecial(cap = false, exclude = null, length = this.length) {
//         let x = '0'
//         for (null; x.length < length;) {
//             if (this.singleNum(1, 0) == 1) {
//                 if (x == '0') {
//                     x = this.letter(cap, 1)
//                 } else {
//                     x += this.letter(cap, 1)
//                 }
//             } else {
//                 if (x == '0') {
//                     x = this.special(exclude, 1)
//                 } else {
//                     x += this.special(exclude, 1)
//                 }
//             }
//         }
//         while (x.length > length) {
//             x = x.slice(0, -1)
//         }
//         return x
//     }
//     alphaNumSpecial(cap = false, exclude = null, length = this.length, max = this.max) {
//         let x = '0'
//         while (x.length < length) {
//             let y = this.singleNum(2, 0);
//             if (y == 2) {
//                 if (x == '0') {
//                     x = this.letter(cap, 1)
//                 } else {
//                     x += this.letter(cap, 1)
//                 }
//             }
//             if (y == 1) {
//                 if (x == '0') {
//                     x = `${this.singleNum(max, 0)}`
//                 } else {
//                     x += `${this.singleNum(max, 0)}`
//                 }
//             } else {
//                 if (x == '0') {
//                     x = this.special(exclude, 1)
//                 } else {
//                     x += this.special(exclude, 1)
//                 }
//             }
//         }
//         while (x.length > length) {
//             x = x.slice(0, -1)
//         }
//         return x
//     }
// }

// module.exports = Random
// export = Random

