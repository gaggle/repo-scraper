const lo = require('lodash')

const { log } = require('./log')

const REPO_DEFAULTS = {
  'badges': [],
  'description': undefined,
  'full_name': undefined,
  'id': undefined,
  'language': undefined,
  'open_issues': undefined,
  'open_issues_html_url': undefined,
  'open_pullrequests': undefined,
  'open_pullrequests_html_url': undefined,
  'owner_html_url': undefined,
  'owner_name': undefined,
  'readme_html': undefined,
  'repo_html_url': undefined,
  'repo_name': undefined
}

module.exports = class {
  constructor ({ cache, requestGetter } = {}) {
    this._cache = cache
    this._reqgetter = requestGetter
    this.data = {
      created_at: new Date(),
      repos: {}
    }
    this.staticFiles = {}
  }

  async addStaticFile (filename, data) {
    this.staticFiles[filename] = data
  }

  async request (cacheKey, payload) {
    const isCached = await this._cache.has(cacheKey)
    if (isCached) {
      log.debug(`Request key '${cacheKey} 'cache HIT`)
    } else {
      log.debug(`Request key '${cacheKey} 'cache miss`)
      await this._cache.set(cacheKey, null)
      try {
        const data = await this._reqgetter.makeRequest(payload)
        log.debug(`Got data from request key '${cacheKey}': ${data}`)
        await this._cache.set(cacheKey, data)
      } catch (err) {
        log.warn(`Error occurred during request key '${cacheKey}'`)
        await this._cache.pop(cacheKey)
        throw err
      }
    }

    return this._cache.get(cacheKey)
  }

  async safeRequest (cacheKey, payload) {
    let result
    try {
      result = await this.request(cacheKey, payload)
    } catch (err) {
      const isIgnorableError = err.statusCode === 404
      if (!isIgnorableError) throw err
      console.log(`Ignorable request error for ${err.options.url}, got ${err.statusCode} - ${err.name}`)
      await this._cache.set(cacheKey, null)
      result = null
    }
    return result
  }

  async setRepoData (repoName, data) {
    const current = this.data.repos[repoName] || {}
    this.data.repos[repoName] = lo.merge({}, REPO_DEFAULTS, current, data)
  }
}
