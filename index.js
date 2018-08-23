/**
 * Dead simple logger for nodejs
 */
const pt = require('path')
const util = require('util')
const os = require('os')

const levels = ['debug', 'info', 'warn', 'error']

function prefixInteger(num, length) {
  return (num / Math.pow(10, length)).toFixed(length).substr(2)
}

function prefix0(num) {
  return prefixInteger(num, 2)
}

const LEVEL_KEY = 'DEFAULTS_DSLOGGER_LEVEL'

class Logger {
  /**
   * 日志构造函数
   * @constructor
   * @param {Object} [opts]
   * @param {Boolean} opts.defaults=false global logger instance
   * @param {String} opts.type json or plain
   * @param {Object|String} opts.format
   *    Available field are:
   *     level: '%l, %level'; time: '%t, %time'; fileName: '%f, %file'; lineNumber: '%line'; columnNumber: '%c, %column'; pid: '%pid';
   */
  constructor(opts) {
    opts = opts || {}
    const { level, defaults, type = 'plain', format } = opts

    this.setType(type, format)

    this.level = level
    this.defaults = defaults

    if (this.defaults) {
      this._env = process.env
    }

    if (!this._level) {
      this.setLevel(level || 'debug')
    }
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
    this._level = level
    if (this.defaults) {
      this._env[LEVEL_KEY] = level
    }
  }

  getLevel() {
    if (this.defaults) {
      return this._env[LEVEL_KEY]
    } else {
      return this._level
    }
  }

  /**
   * Change prefix of log.
   * @param {String} prefix
   */
  setType(type, format) {
    if (type === 'json') {
      this.type = 'json'
      this.format = format || {
        time: '%time',
        fileline: '%file %line',
        level: '%level',
        pid: '%pid',
        hostname: os.hostname()
      }
    } else {
      this.type = 'plain'
      this.format = format || '[%time][%level][%file %line]: %msg'
    }
  }

  /**
   * Print the log.
   */
  print(level, msg, ...args) {
    const loggerLevelIndex = levels.indexOf(this.getLevel() || 'debug')
    const thisLevelIndex = levels.indexOf(level)

    const now = new Date()
    const timeStr = `${now.getFullYear()}-${prefix0(
      now.getMonth() + 1
    )}-${prefix0(now.getDate())} ${prefix0(now.getHours())}:${prefix0(
      now.getMinutes()
    )}:${prefix0(now.getSeconds())}.${now.getMilliseconds()}`

    if (thisLevelIndex >= loggerLevelIndex) {
      const extra = Logger.getExtraInfo(this[level])
      let message = ''
      const format = this.format

      // 多余的日志参数
      let restMsg = ''
      args.forEach(x => {
        let str = x
        if (typeof x === 'string') {
          str = x
        } else {
          str = util.inspect(x, {
            breakLength: Infinity
          })
        }
        if (restMsg) {
          restMsg = `${restMsg} ${str}`
        } else {
          restMsg = str
        }
      })

      if (this.type === 'json') {
        let fields
        if (msg instanceof Error) {
          let err = { message: msg.message, name: msg.name, stack: msg.stack }
          fields = { msg: msg.message, err }
        } else if (Array.isArray(msg)) {
          fields = { msg: util.inspect(msg, { breakLength: Infinity }) }
        } else if (Object(msg) === msg) {
          fields = msg
        } else {
          fields = { msg }
        }
        message = Object.assign({}, format, fields)

        if (restMsg) {
          message.msg = `${message.msg || ''}${restMsg}`
        }

        message = JSON.stringify(message)
      } else {
        if (typeof msg !== 'string') {
          message = util.inspect(msg, {
            breakLength: Infinity
          })
        } else {
          message = msg
        }

        if (restMsg) {
          message = `${message || ''}${restMsg}`
        }

        message = format.replace(/%(?:msg)\b/, message)
      }

      message = message
        .replace(/%(?:level|l)\b/g, level)
        .replace(/%(?:time|t)\b/g, timeStr)
        .replace(/%(?:file|f)\b/g, extra.fileName)
        .replace(/%(?:line)\b/g, extra.lineNumber)
        .replace(/%(?:column|c)\b/g, extra.columnNumber)
        .replace(/%(?:pid)\b/g, process.pid)

      return this.doPrint(level, message)
    }
  }

  /**
   * Print method. You can overwrite this method to do custom print
   */
  doPrint(level, ...args) {
    let consoleMethod = level == 'debug' ? 'info' : level
    return console[consoleMethod](...args)
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

    Error.prepareStackTrace = function(dummyObject, v8StackTrace) {
      return v8StackTrace
    }
    Error.captureStackTrace(dummyObject, belowFn || this.getStack)

    const v8StackTrace = dummyObject.stack

    Error.prepareStackTrace = v8Handler

    return v8StackTrace
  }
  static get LEVELS() {
    return levels
  }
}

/**
 * singleton logger
 */
Logger.logger = new Logger({
  defaults: true
})

module.exports = Logger
