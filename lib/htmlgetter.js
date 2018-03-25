const lo = require('lodash')
const request = require('request-promise-native')

module.exports = class {
  constructor ({timeout} = {timeout: 3000}) {
    this._timeout = timeout
  }

  async makeRequest (options) {
    return request(this._getRequestOptions(options))
  }

  _getRequestOptions (options) {
    if (typeof(options) === 'string') {
      options = {
        url: options
      }
    }
    const defaultOptions = {
      encoding: null,
      headers: {
        'User-Agent': 'repo-scraper'
      },
      timeout: this._timeout,
    }
    return lo.merge({}, defaultOptions, options)
  }
}
