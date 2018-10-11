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
   * @param {Function} opts.formater format log custom
   */
  constructor(opts) {
    opts = opts || {}
    const {
      level,
      defaults,
      type = 'plain',
      format,
      streams = [],
      formater = this._defaultFormater
    } = opts

    this.setType(type, format)
    this.setFormater(formater)

    this.level = level
    this.defaults = defaults

    if (this.defaults) {
      this._env = process.env
    }

    if (!this._level) {
      this.setLevel(level || 'debug')
    }

    this.inpsectOptions = { breakLength: Infinity, depth: 5 }
    this._hostname = os.hostname()
    this.streams = streams
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
    } else {
      this.type = 'plain'
      this.format = format || '[%time][%level][%file %line]: %msg'
    }
  }

  setFormater(formater) {
    if (typeof formater === 'function') {
      this.formater = formater
    } else {
      throw new TypeError('formater must be a function')
    }
  }

  inspect(message, opts = {}) {
    return util.inspect(message, Object.assign({}, this.inpsectOptions, opts))
  }

  objectFormater(message) {
    let fields = {}
    // error
    let error
    if (message && (message.err instanceof Error)) {
      error = message.err
      fields = { msg: error.message, ...message }
    } else if (message instanceof Error) {
      error = message
      fields = { msg: error.message }
    }
    if (error) {
      error = Object.assign({
        message: error.message,
        name: error.name,
        stack: error.stack,
        ...error
      })
      fields.err = error
    }else  if (Array.isArray(message)) {
      fields = { msg: this.inspect(message) }
    } else if (Object(message) === message) {
      fields = message
    } else {
      fields = { msg: message }
    }

    return fields
  }

  // default formater
  _defaultFormater(level, message, ...args) {
    // 附加日志参数
    let restMsg = args.reduce((restMsg, x) => {
      let str = x

      if (typeof x === 'string') {
        str = x
      } else {
        str = this.inspect(x)
      }
      if (restMsg) {
        restMsg = `${restMsg} ${str}`
      } else {
        restMsg = str
      }
      return restMsg
    }, '')
    
    const extra = Logger.getExtraInfo(this[level])
    let msg = ''
    if (this.type === 'json') {
      let fields = this.objectFormater(message, ...args)

      msg = fields.msg

      if (restMsg) {
        fields.msg = `${msg ? msg + ' ' : ''}${restMsg}`
      }

      msg = JSON.stringify(Object.assign({
        time: extra.time,
        fileline: `${extra.file} ${extra.line}`,
        level,
        pid: extra.pid,
        hostname: this._hostname
      }, fields))
    } else {
      if (typeof message !== 'string') {
        msg = this.inspect(message)
      } else {
        msg = message
      }

      if (restMsg) {
        msg = `${msg || ''} ${restMsg}`
      }
      msg = this.format.replace(/%(?:msg)\b/, msg)
        .replace(/%(?:level|l)\b/g, level)
        .replace(/%(?:time|t)\b/g, extra.time)
        .replace(/%(?:file|f)\b/g, extra.file)
        .replace(/%(?:line)\b/g, extra.line)
        .replace(/%(?:column|c)\b/g, extra.column)
        .replace(/%(?:pid)\b/g, extra.pid)
        .replace(/%(?:hostname)\b/g, this._hostname)
    }
    return msg
  }

  /**
   * Print the log.
   */
  print(level, msg, ...args) {
    if (this.checkLevel(level)) {
      let message = this.formater(level, msg, ...args)

      return this.doPrint(level, message)
    }
  }

  /**
   * Print method. You can overwrite this method to do custom print
   */
  doPrint(level, message) {
    let consoleMethod = level == 'debug' ? 'info' : level    
    this.streams.forEach(({ level:dlevel, stream }) => {
      if (this.checkLevel(level, dlevel)) {
        stream.write(message + '\n')
      }
    })
    return console[consoleMethod](message)
  }

  checkLevel(level, dlevel) {
    const loggerLevelIndex = levels.indexOf(dlevel || this.getLevel() || 'debug')
    const thisLevelIndex = levels.indexOf(level)

    return thisLevelIndex >= loggerLevelIndex
  }

  /**
   * Extra info
   * @param {Function} [belowFn]
   * @return {Object}
   */
  static getExtraInfo(belowFn) {
    const trace = this.getStack(belowFn)[0]
    const file = pt.relative(process.cwd(), trace.getFileName())
    const now = new Date()
    const timeStr = `${now.getFullYear()}-${prefix0(
      now.getMonth() + 1
    )}-${prefix0(now.getDate())} ${prefix0(now.getHours())}:${prefix0(
      now.getMinutes()
    )}:${prefix0(now.getSeconds())}.${now.getMilliseconds()}`

    return {
      file,
      line: trace.getLineNumber(),
      column: trace.getColumnNumber(),
      time: timeStr,
      pid: process.pid
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
