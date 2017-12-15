const debug = require('debug')

const DEBUG = 5
const INFO  = 4
const WARN  = 3
const ERROR = 2
const FATAL = 1

class Logging {
  constructor(namespace, level = 'debug') {
    this.fn = {}
    this.fn.debug = debug(`${namespace}:debug`)
    this.fn.info  = debug(`${namespace}:info`)
    this.fn.warn  = debug(`${namespace}:warn`)
    this.fn.error = debug(`${namespace}:error`)
    this.fn.fatal = debug(`${namespace}:fatal`)
    this.fn.debug.log = console.log.bind(console)
    this.fn.info.log  = console.log.bind(console)
    this.fn.warn.log  = console.log.bind(console)
    if      (level == 'debug') { this.level = DEBUG }
    else if (level == 'info')  { this.level = INFO }
    else if (level == 'warn')  { this.level = WARN }
    else if (level == 'error') { this.level = ERROR }
    else if (level == 'fatal') { this.level = FATAL }
    else                       { this.level = DEBUG }
  }
  debug(fmt, ...args) { if (this.level >= DEBUG) this.fn.debug(fmt, ...args) }
  info (fmt, ...args) { if (this.level >= INFO)  this.fn.info(fmt, ...args) }
  warn (fmt, ...args) { if (this.level >= WARN)  this.fn.warn(fmt, ...args) }
  error(fmt, ...args) { if (this.level >= ERROR) this.fn.error(fmt, ...args) }
  fatal(fmt, ...args) { if (this.level >= FATAL) this.fn.fatal(fmt, ...args) }
}

function loggingFactory(namespace) {
  return new Logging(namespace)
}

module.exports = loggingFactory