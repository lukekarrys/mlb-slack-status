module.exports = class Logger {
  constructor ({ max = 100, logger = console } = {}) {
    this.max = max
    this.logger = logger
    this._logs = []

    const types = ['log', 'info', 'error']
    const noops = ['debug']

    types.forEach((type) => (this[type] = (...args) => this._log(type, ...args)))
    noops.forEach((type) => (this[type] = () => {}))
  }

  toString () {
    return this._logs.join('\n')
  }

  _log (type, ...args) {
    const log = `${new Date().toJSON()} [${type.toUpperCase()}] ${args.join(' ')}`
    this.push(log)
    ;(this.logger[type] || this.logger.log)(log)
  }

  push (log) {
    this._logs = [...this._logs.slice((this.max - 1) * -1), log]
  }
}
