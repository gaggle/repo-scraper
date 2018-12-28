/* global describe, it, beforeEach, afterEach, expect */
const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp-promise')

const Cached = require('../../lib/cached')

const RESOURCE_PATH = path.join(__dirname, '..', 'fixtures', 'resource-files')

describe('Cached', () => {
  let cachePath

  beforeEach(async () => {
    const o = await tmp.dir()
    cachePath = o.path
  })

  afterEach(async () => fs.remove(cachePath))

  describe('(constructor)', () => {
    it('should run in empty folder', async () => {
      const cache = await getCache(cachePath)

      expect(cache.allKeys()).toEqual([])
    })

    it('should persist data for later initialisations', async () => {
      // This seeds the folder with data
      await getCache(cachePath, { preload: true })

      // then we grab a new instance to see if it comes with that data
      const cached = new Cached(cachePath)

      const numExpectedKeys = (await fs.readdir(RESOURCE_PATH)).length + 1 // We _add one non-file entry
      expect(cached.allKeys().length).toEqual(numExpectedKeys)
    })
  })

  describe('#get', () => {
    it('should get undefined for unknown entry', async () => {
      const cache = await getCache(cachePath)

      expect(await cache.get('unknown')).toBeUndefined()
    })

    it('should get null entry as null', async () => {
      const cache = await getCache(cachePath, { preload: true })

      const entry = await cache.get('null')

      expect(entry).toBe(null)
    })

    it('should get entry as buffer', async () => {
      const cache = await getCache(cachePath, { preload: true })

      const entry = await cache.get('string')

      expect(entry).toBeInstanceOf(Buffer)
      expect(entry.toString()).toEqual('foo\n')
    })
  })

  describe('#has', () => {
    it('should get false for unknown entry', async () => {
      const cache = await getCache(cachePath)

      const result = await cache.has('unknown')

      expect(result).toBe(false)
    })

    it('should get true for known entry', async () => {
      const cache = await getCache(cachePath)
      await cache.set('foo', 'data')

      const result = await cache.has('foo')

      expect(result).toBe(true)
    })
  })

  describe('#pop', () => {
    it('should return cached entry', async () => {
      const cache = await getCache(cachePath)
      await cache.set('foo', 'bar')

      const buffer = await cache.pop('foo')

      expect(buffer.toString()).toBe('bar')
    })

    it('should delete cached entry', async () => {
      const cache = await getCache(cachePath)
      await cache.set('foo', 'bar')

      await cache.pop('foo')

      const result = await cache.get('foo')
      expect(result).toBeUndefined()
    })

    it('should delete cached entry even if its null', async () => {
      const cache = await getCache(cachePath)
      await cache.set('foo', null)

      await cache.pop('foo')

      expect(await cache.has('foo')).toBe(false)
    })

    it('should ignore unknown entry', async () => {
      const cache = await getCache(cachePath)

      const result = await cache.pop('unknown')

      expect(result).toBeUndefined()
    })
  })

  describe('#set', () => {
    describe('when adding', () => {
      it('should cache string data', async () => {
        const cache = await getCache(cachePath)

        await cache.set('key', 'content')

        const buffer = await cache.get('key')
        expect(buffer.toString()).toEqual('content')
      })

      it('should cache stream', async () => {
        const cache = await getCache(cachePath)

        await cache.set('key', await fs.readFile(getResource('string')))

        const buffer = await cache.get('key')
        expect(buffer.toString()).toEqual('foo\n')
      })

      it('should cache null', async () => {
        const cache = await getCache(cachePath)

        await cache.set('foo', null)

        const result = await cache.get('foo')
        expect(result).toBe(null)
      })

      it('should cache undefined as null', async () => {
        const cache = await getCache(cachePath)

        await cache.set('foo', undefined)

        const result = await cache.get('foo')
        expect(result).toBe(null)
      })
    })

    describe('when updating', () => {
      it('should _update existing entry', async () => {
        const cache = await getCache(cachePath)

        await cache.set('foo', 'ham')
        await cache.set('foo', 'spam')

        const buffer = await cache.get('foo')
        expect(buffer.toString()).toBe('spam')
      })
    })
  })

  describe('#allKeys', () => {
    it('should be empty list when no keys', async () => {
      const cache = await getCache(cachePath)
      expect(cache.allKeys()).toEqual([])
    })

    it('should return all loaded keys in insertion order', async () => {
      const cache = await getCache(cachePath)
      await cache.set('foo')
      await cache.set('bar')
      await cache.set('baz')
      expect(cache.allKeys()).toEqual(['foo', 'bar', 'baz'])
    })
  })
})

const getCache = async (cachePath, { preload } = {}) => {
  if (!cachePath) throw new Error('Missing cachePath')

  const cache = new Cached(cachePath)
  if (preload) {
    const files = await fs.readdir(RESOURCE_PATH)
    const promises = files.map(async filename => {
      return cache._add(filename, await fs.readFile(getResource(filename)))
    })
    promises.push(cache._add('null', null))
    await Promise.all(promises)
  }
  return cache
}

const getResource = filename => {
  return path.join(RESOURCE_PATH, filename)
}
