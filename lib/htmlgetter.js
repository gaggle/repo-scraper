const lo = require('lodash')
const request = require('request-promise-native')

module.exports = class {
  constructor (opts = {}) {
    opts = lo.merge({
      maxAttempts: 2,
      retryDelay: 500,
      timeout: 10000
    }, opts)

    if (opts.maxAttempts < 1) throw new Error('maxAttempts must be 1 or higher')
    if (opts.retryDelay < 0) throw new Error('retryDelay must be 0 or higher')

    this._maxAttempts = opts.maxAttempts
    this._retryDelay = opts.retryDelay
    this._timeout = opts.timeout
  }

  async makeRequest (options) {
    let result
    let attempt = 1
    const fullOptions = this._getRequestOptions(options)

    while (true) {
      try {
        result = await request(fullOptions)
        break
      } catch (err) {
        const retryableError = err.statusCode === 504
        if (!retryableError) throw err

        if (attempt >= this._maxAttempts) throw err
        attempt++
        console.log(`Retryable request error for ${err.options.url}, got ${err.statusCode} - ${err.name} (will attempt ${attempt}/${this._maxAttempts})`)
        await sleep(this._retryDelay)
      }
    }
    return result
  }

  _getRequestOptions (options) {
    if (typeof (options) === 'string') {
      options = {
        url: options
      }
    }
    const defaultOptions = {
      encoding: null,
      headers: {
        'User-Agent': 'repo-scraper'
      },
      timeout: this._timeout
    }
    return lo.merge({}, defaultOptions, options)
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
