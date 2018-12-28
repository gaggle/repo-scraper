const lo = require('lodash')

const { log } = require('./log')

/**
 * Class to handle repo data
 *
 * Use #safeRequest to make a request (the class will smartly retry and handle caching internally),
 * then use #setRepoData to add data for a specific repository, in whatever format you need.
 *
 * Use #addStaticFile to add data for an arbitrary filename.
 *
 * Use #getData and #getStaticFiles to get all data back
 *
 * @type {module.exports}
 */
module.exports = class {
  constructor ({ cache, requestGetter, repoDefaults = {} } = {}) {
    this._cache = cache
    this._data = {
      createdAt: new Date(),
      repos: {}
    }
    this._repoDefaults = repoDefaults
    this._reqgetter = requestGetter
    this._staticFiles = {}
  }

  addStaticFile (filename, data) {
    this._staticFiles[filename] = data
  }

  getData () {
    return lo.clone(this._data)
  }

  getStaticFiles () {
    return lo.clone(this._staticFiles)
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
    const current = this._data.repos[repoName] || {}
    this._data.repos[repoName] = lo.merge({}, this._repoDefaults, current, data)
  }
}
