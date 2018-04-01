/* global describe, it, beforeAll, beforeEach, afterEach, afterAll, expect */
const nock = require('nock')

const HtmlGetter = require('../../lib/htmlgetter')

describe('HtmlGetter', () => {
  let htmlGetter

  beforeAll(() => nock.disableNetConnect())
  beforeEach(() => { htmlGetter = new HtmlGetter() })
  afterEach(() => nock.cleanAll())
  afterAll(() => nock.enableNetConnect())

  describe('(constructor)', () => {
    it('should refuse to construct if maxAttempts is too low', () => {
      expect(() => new HtmlGetter({maxAttempts: 0})).toThrow()
    })

    it('should refuse to construct if retryDelay is too low', () => {
      expect(() => new HtmlGetter({retryDelay: -1})).toThrow()
    })
  })

  describe('#makeRequest', () => {
    it('should accept a string', async () => {
      const ctx = nock('http://foo.com').get('/').reply(200)

      await htmlGetter.makeRequest('http://foo.com')

      ctx.done()
    })

    it('should accept url in options', async () => {
      const ctx = nock('http://foo.com').get('/').reply(200)

      await htmlGetter.makeRequest({url: 'http://foo.com'})

      ctx.done()
    })

    it('should set User-Agent', async () => {
      const ctx = nock('http://foo.com', {
        reqheaders: {
          'user-agent': 'repo-scraper'
        }
      }).get('/').reply(200)

      await htmlGetter.makeRequest('http://foo.com')

      ctx.done()
    })

    it('should return buffer (so as not to mess up binary files)', async () => {
      const ctx = nock('http://foo.com')
        .get('/')
        .reply(200, () => Buffer.from('foo'))

      const buffer = await htmlGetter.makeRequest('http://foo.com')

      ctx.done()
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.toString()).toEqual('foo')
    })

    it('should raise an error on timeout', async (done) => {
      const ctx = nock('http://foo.com')
        .get('/')
        .delay(2000)
        .reply(200, 'foo')
      htmlGetter = new HtmlGetter({timeout: 1})

      try {
        await htmlGetter.makeRequest('http://foo.com')
        done.fail()
      } catch (err) {
        expect(err.message).toEqual(expect.stringMatching(/ESOCKETTIMEDOUT/))
        ctx.done()
        done()
      }
    })

    it('should retry a 504', async () => {
      const ctx = nock('http://foo.com')
        .get('/')
        .reply(504)
        .get('/')
        .reply(200, 'foo')
      htmlGetter = new HtmlGetter({maxAttempts: 2, retryDelay: 0})

      const buffer = await htmlGetter.makeRequest('http://foo.com')

      ctx.done()
      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.toString()).toEqual('foo')
    })

    it('should fail a 504 if it goes beyond max attempts', async (done) => {
      const ctx = nock('http://foo.com')
        .get('/')
        .reply(504)
      htmlGetter = new HtmlGetter({maxAttempts: 1})

      try {
        await htmlGetter.makeRequest('http://foo.com')
        done.fail()
      } catch (err) {
        expect(err.message).toEqual(expect.stringMatching(/504/))
        ctx.done()
        done()
      }
    })
  })
})
