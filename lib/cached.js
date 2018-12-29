const FileSync = require('lowdb/adapters/FileSync')
const fs = require('fs-extra')
const lo = require('lodash')
const low = require('lowdb')
const path = require('path')

const sanitizer = require('./sanitizer')

module.exports = class {
  constructor (cacheDir) {
    this._cacheDir = path.resolve(cacheDir)
    this._assetsDir = path.join(this._cacheDir, 'assets')
    fs.ensureDirSync(this._assetsDir)
    this._cache = low(new FileSync(path.join(this._cacheDir, 'db.json')))
    this._cache.defaults({ entries: [] })
      .write()
  }

  async get (key) {
    const entry = await this._cache.get('entries')
      .find({ id: key })
      .value()
    if (!entry) return

    return entry.file ? fs.readFile(entry.file) : entry.file
  }

  async has (key) {
    const entry = await this._cache.get('entries')
      .find({ id: key })
      .value()
    return !!entry
  }

  async pop (key) {
    const entry = await this.get(key)

    if (entry === undefined) return

    await this._cache.get('entries')
      .remove({ id: key })
      .write()

    return entry
  }

  async set (key, data) {
    if (await this.has(key)) {
      return this._update(key, data)
    } else {
      return this._add(key, data)
    }
  }

  allKeys () {
    let entries = this._cache.get('entries').value()
    return lo.map(entries, 'id')
  }

  async _add (key, data) {
    const filepath = await this._writeData(key, data)

    await this._cache.get('entries')
      .push({ id: key, file: filepath, createdAt: new Date() })
      .write()
  }

  async _update (key, data) {
    const filepath = await this._writeData(key, data)

    await this._cache.get('entries')
      .find({ id: key })
      .assign({ id: key, file: filepath, updatedAt: new Date() })
      .write()
  }

  async _writeData (key, data) {
    let filepath = null
    if (data) {
      filepath = this._getCacheFilepath(key)
      await fs.outputFile(filepath, data)
    }
    return filepath
  }

  _getCacheFilepath (key) {
    return path.join(this._assetsDir, sanitizer.hashify(key))
  }
}
