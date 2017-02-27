/**
 * Dead simple logger for nodejs
 */
const pt = require('path')

const levels = ['debug', 'info', 'warn', 'error']

function prefixInteger(num, length) {
  return (num / Math.pow(10, length)).toFixed(length).substr(2);
}

function prefix0 (num) {
  return prefixInteger(num, 2)
}

class Logger {
  constructor (opts) {
    opts = opts || {}
    Object.assign(this, opts)
    //default prefix is '[%t] [%l] [%f %line]: '
    this.prefix = this.prefix || '[%time] [%level] [%file %line]: '
  }
  debug() {
    return this.print('debug', ...arguments)
  }
  info() {
    return this.print('info', ...arguments)
  }
  warn() {
    return this.print('warn', ...arguments)
  }
  error() {
    return this.print('error', ...arguments)
  }

  get log() {
    return this.info
  }

  /**
   * Set log level.
   * Available log levels are: 'debug', 'info', 'warn', 'error'
   * @param {String} level
   */
  setLevel(level) {
    this.level = level
  }

  /**
   * Change prefix of log.
   * Available field are:
   *  level: '%l, %level'; time: '%t, %time'; fileName: '%f, %file'; lineNumber: '%line'; columnNumber: '%c, %column'
   * @param {String} prefix
   */
  setPrefix(prefix) {
    this.prefix = prefix
  }

  /**
   * Print the log.
   */
  print(level, msg, ...args) {
    const loggerLevelIndex = levels.indexOf(this.level || 'debug')
    const thisLevelIndex = levels.indexOf(level)

    const now = new Date()
    const timeStr = `${now.getFullYear()}-${prefix0(now.getMonth() + 1)}-${prefix0(now.getDate())} ${prefix0(now.getHours())}:${prefix0(now.getMinutes())}:${prefix0(now.getSeconds())}`

    if(thisLevelIndex >= loggerLevelIndex) {
      const extra = Logger.getExtraInfo(this[level])
      let prefix = this.prefix || ''

      prefix = prefix.replace(/%(?:level|l)\b/g, level)
        .replace(/%(?:time|t)\b/g, timeStr)
        .replace(/%(?:file|f)\b/g, extra.fileName)
        .replace(/%(?:line)\b/g, extra.lineNumber)
        .replace(/%(?:column|c)\b/g, extra.columnNumber)

      return this.doPrint(level, `${prefix}${msg}`, ...args)
    }
  }

  /**
   * Print method. You can overwrite this method to do custom print
   */
  doPrint(level, ...args) {
    return console.log(...args)
  }

  /**
   * Extra info
   * @param {Function} [belowFn]
   * @return {Object}
   */
  static getExtraInfo(belowFn) {
    const trace = this.getStack(belowFn)[0]
    const fileName = pt.relative(process.cwd(), trace.getFileName())
    return {
      fileName: fileName,
      lineNumber: trace.getLineNumber(),
      columnNumber: trace.getColumnNumber()
    }
  }
  /**
   * @see https://github.com/felixge/node-stack-trace
   */
  static getStack(belowFn) {
    const v8Handler = Error.prepareStackTrace
    const dummyObject = {}

    Error.prepareStackTrace = function(dummyObject, v8StackTrace) { return v8StackTrace }
    Error.captureStackTrace(dummyObject, belowFn || this.getStack)

    const v8StackTrace = dummyObject.stack

    Error.prepareStackTrace = v8Handler

    return v8StackTrace
  }
  static get LEVELS (){
    return levels
  }
}

/**
 * singleton logger
 */
Logger.logger = new Logger

module.exports = Logger
