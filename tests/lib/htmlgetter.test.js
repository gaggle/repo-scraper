/* global describe, it, beforeAll, beforeEach, afterEach, afterAll, expect */
const nock = require('nock')

const HtmlGetter = require('../../lib/htmlgetter')

describe('HtmlGetter', () => {
  let htmlGetter

  beforeAll(() => nock.disableNetConnect())
  beforeEach(() => { htmlGetter = new HtmlGetter() })
  afterEach(() => nock.cleanAll())
  afterAll(() => nock.enableNetConnect())

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
    nock('http://foo.com')
      .get('/')
      .delay(2000)
      .reply(200, 'foo')

    htmlGetter = new HtmlGetter({timeout: 1})
    try {
      await htmlGetter.makeRequest('http://foo.com')
      done.fail()
    } catch (err) {
      expect(err.message).toEqual(expect.stringMatching(/ESOCKETTIMEDOUT/))
      done()
    }
  })
})
