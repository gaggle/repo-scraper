/* global jest, describe, it, beforeAll, beforeEach, afterEach, afterAll, expect */
const nock = require('nock')

const Cached = require('../../lib/cached')
const Container = require('../../lib/cachedcontainer')
const HtmlGetter = require('../../lib/htmlgetter')

jest.mock('../../lib/cached')
jest.mock('../../lib/htmlgetter')

describe('CachedHtmlContainer', () => {
  let cache
  let getter
  let container

  beforeAll(() => nock.disableNetConnect())

  beforeEach(() => {
    jest.useFakeTimers()
    cache = new Cached()
    getter = new HtmlGetter()
    container = new Container({cache, requestGetter: getter})
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    nock.cleanAll()
  })

  afterAll(() => nock.enableNetConnect())

  describe('(constructor)', () => {
    it('should initialize naked', () => {
      const c = new Container()
      expect(c._cache).toBeUndefined()
      expect(c._reqgetter).toBeUndefined()
    })

    it('should accept injection of cache and getter', () => {
      const c = new Container({cache: 'foo', requestGetter: 'bar'})
      expect(c._cache).toEqual('foo')
      expect(c._reqgetter).toEqual('bar')
    })

    it('should set creation date in data store', () => {
      const c = new Container({cache, getter})
      expect(c.data.created_at).toBeInstanceOf(Date)
    })
  })

  describe('#addStaticFiles', () => {
    it('should add entries to file store', async () => {
      await container.addStaticFile('foo', 'bar')

      expect(container.staticFiles).toEqual({'foo': 'bar'})
    })
  })

  describe('#request', () => {
    describe('if cached', () => {
      beforeEach(() => cache.has.mockImplementationOnce(() => true))

      it('should return value from cache', async () => {
        cache.get.mockImplementationOnce(async () => 'foo')

        const result = await container.request()

        expect(result).toEqual('foo')
      })

      it('should get from cache', async () => {
        await container.request('key', 'foo')

        expect(cache.get).toHaveBeenCalledTimes(1)
      })

      it('should not make a request', async () => {
        await container.request('key', 'foo')

        expect(getter.makeRequest).not.toHaveBeenCalled()
      })
    })

    describe('if uncached', () => {
      beforeEach(() => cache.has.mockImplementationOnce(() => false))

      it('should return value from cache', async () => {
        cache.get.mockImplementationOnce(async () => 'foo')

        const result = await container.request()

        expect(result).toEqual('foo')
      })

      it('should update cache to request payload', async () => {
        getter.makeRequest.mockImplementationOnce(async payload => payload)

        await container.request('key', 'foo')

        expect(cache.set).toHaveBeenCalledWith('key', 'foo')
      })

      it('should make a request', async () => {
        await container.request('key', 'foo')

        expect(getter.makeRequest).toHaveBeenCalledWith('foo')
      })

      it('should first add null to cache, then update with request payload', async () => {
        getter.makeRequest.mockImplementationOnce(async payload => payload)

        await container.request('key', 'foo')

        expect(cache.set).toHaveBeenCalledWith('key', null)
        expect(cache.set).toHaveBeenCalledWith('key', 'foo')
      })

      it('should not cache if request fails', async () => {
        getter.makeRequest.mockImplementationOnce(async () => { throw new Error('Stop!') })

        try {
          await container.request('key')
        } catch (err) {}

        expect(cache.pop).toHaveBeenCalledWith('key')
      })
    })
  })

  describe('#safeRequest', () => {
    it('should return value from cache as normal', async () => {
      cache.get.mockImplementationOnce(async () => 'foo')

      const result = await container.request()

      expect(result).toEqual('foo')
    })

    it('should cache result as normal', async () => {
      getter.makeRequest.mockImplementationOnce(async payload => payload)

      await container.safeRequest('key', 'foo')

      expect(cache.set).toHaveBeenCalledWith('key', 'foo')
    })

    it('should set cache to null if request fails with 404', async () => {
      getter.makeRequest.mockImplementationOnce(async () => {
        const err = new Error('Stop!')
        err.statusCode = 404
        err.options = {}
        throw err
      })

      await container.safeRequest('key', 'foo')

      expect(cache.set).toHaveBeenCalledWith('key', null)
    })

    it('should throw if request fails with unknown error', async (done) => {
      getter.makeRequest.mockImplementationOnce(async () => {
        const err = new Error('Stop!')
        err.statusCode = 'foo'
        throw err
      })

      try {
        await container.safeRequest('key', 'foo')
        done.fail()
      } catch (err) {
        done()
      }
    })
  })

  describe('#setRepoData', () => {
    it('should set data for repo entry', () => {
      container.setRepoData('foo', {ham: 'spam'})

      expect(container.data.repos.foo).toEqual(expect.objectContaining({ham: 'spam'}))
    })

    it('should specify badges as array by default', () => {
      container.setRepoData('foo')

      expect(container.data.repos.foo).toEqual(expect.objectContaining({badges: []}))
    })
  })
})
