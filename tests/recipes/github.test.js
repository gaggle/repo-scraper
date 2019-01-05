/* global jest, describe, it, beforeEach, afterEach, expect */
const lo = require('lodash')
const { StatusCodeError } = require('request-promise-core/lib/errors.js')

const Container = require('../../lib/cached-requester')
const errors = require('../../lib/errors')
const recipe = require('../../recipes/github')
const sanitizer = require('../../lib/sanitizer')

const userReposData200 = require('../fixtures/github/api.github.com/user/repos/200.index.json')
const userReposData401 = require('../fixtures/github/api.github.com/user/repos/401.index.json')

const helpers = require('../helpers')

const objContaining = expect.objectContaining

jest.mock('../../lib/cached-requester', () => jest.fn().mockImplementation(() => ({
  addStaticFile: jest.fn(),
  safeRequest: jest.fn().mockResolvedValue(Buffer.from('')),
  setRepoData: jest.fn()
})))

describe('initialize', () => {
  const oldEnv = process.env

  beforeEach(() => { process.env = { ...oldEnv } })

  afterEach(() => { process.env = oldEnv })

  it('should raise error w. missing env. variable', async () => {
    await expect(recipe.initialize()).rejects.toBeInstanceOf(errors.InitializeError)
  })

  it('should pass w. GH_TOKEN specified', async () => {
    process.env.GH_TOKEN = 'token'
    await expect(recipe.initialize()).resolves.toBe(undefined)
  })
})

describe('scrape', () => {
  const oldEnv = process.env
  let container
  let userRepo

  beforeEach(() => {
    container = new Container()
    container.mockData = {}
    container.setRepoData.mockImplementation((key, d) => {
      if (container.mockData[key] === undefined) container.mockData[key] = {}
      lo.merge(container.mockData[key], d)
    })
    userRepo = userReposData200[0]

    process.env = { ...oldEnv }
  })

  afterEach(() => { process.env = oldEnv })

  const expectMockDataToEqual = ideal => expect(container.mockData[userRepo.full_name]).toEqual(ideal)

  it('should specify scrape recipe', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({ scrapeRecipe: 'github' }))
  })

  it('should scrape unique id', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({ id: userRepo.full_name }))
  })

  it('should scrape basic repo information', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({
      description: 'Foo bar baz',
      fullName: 'user/name',
      ownerHtmlUrl: 'https://github.com/user',
      ownerName: 'user',
      repoHtmlUrl: 'https://github.com/user/name',
      repoName: 'name'
    }))
  })

  it('should scrape issues', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({
      openIssues: 0,
      openIssuesHtmlUrl: 'https://github.com/user/name/issues'
    }))
  })

  it('should scrape pullrequests', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({
      openPullrequests: 0,
      openPullrequestsHtmlUrl: 'https://github.com/user/name/pulls'
    }))
  })

  it('should cope with no README', async () => {
    const readme = null
    mockRequests(container.safeRequest, { readme: readme })

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({
      badges: [],
      readmeHtml: null
    }))
  })

  it('should scrape README', async () => {
    mockRequests(container.safeRequest, { readme: getReadme('foo') })

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({
      readmeHtml: helpers.htmlify('<div><p>foo</p></div>')
    }))
  })

  it('should scrape language', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({ language: 'Shell' }))
  })

  it('should scrape language', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({ language: 'Shell' }))
  })

  describe('badges', () => {
    it('should have relative src as repo id + image path', async () => {
      mockRequests(container.safeRequest, {
        readme: getReadme('foo', [{ src: 'path/some-file.png' }]),
        resource: helpers.readResourceFile('png.16x16.png')
      })

      await recipe.scrape(container)

      expectMockDataToEqual(objContaining({ badges: [objContaining({ src: 'user/name/path/some-file.png' })] }))
    })

    it('should have absolute src as hashified src', async () => {
      mockRequests(container.safeRequest, {
        readme: getReadme('foo', [{ src: 'http://foo/some-file' }]),
        resource: helpers.readResourceFile('png.16x16.png')
      })

      await recipe.scrape(container)

      expectMockDataToEqual(objContaining({
        badges: [objContaining({
          src: `user/name/${sanitizer.hashify('http://foo/some-file')}.png`
        })]
      }))
    })

    it('should have canonical src pointing to original url', async () => {
      mockRequests(container.safeRequest, {
        readme: getReadme('foo', [{ src: 'path/some-file.png' }]),
        resource: helpers.readResourceFile('png.16x16.png')
      })

      await recipe.scrape(container)

      expectMockDataToEqual(objContaining({
        badges: [objContaining({
          'canonicalSrc': 'https://raw.githubusercontent.com/user/name/master/path/some-file.png'
        })]
      }))
    })

    it('should have size data', async () => {
      mockRequests(container.safeRequest, {
        readme: getReadme('foo', [{ src: 'path/some-file.png' }]),
        resource: helpers.readResourceFile('png.16x16.png')
      })

      await recipe.scrape(container)

      expectMockDataToEqual(objContaining({
        badges: [objContaining({
          size: { width: 16, height: 16, type: 'png' }
        })]
      }))
    })

    it('should respect existing canonical src', async () => {
      mockRequests(container.safeRequest, {
        readme: getReadme('foo', [{
          src: 'foo.png',
          canonical_src: 'http://a/canonical/path.png'
        }]),
        resource: helpers.readResourceFile('png.16x16.png')
      })

      await recipe.scrape(container)

      expectMockDataToEqual(objContaining({
        badges: [objContaining({
          'canonicalSrc': 'http://a/canonical/path.png'
        })]
      }))
    })

    it('should scrape <a> href', async () => {
      mockRequests(container.safeRequest, {
        readme: getReadme('foo', [{ src: 'foo.png', href: 'http://a/link' }]),
        resource: helpers.readResourceFile('png.16x16.png')
      })

      await recipe.scrape(container)

      expectMockDataToEqual(objContaining({ badges: [objContaining({ href: 'http://a/link' })] }))
    })

    it('should cope with image failing to download', async () => {
      mockRequests(container.safeRequest, {
        readme: getReadme('foo', [{ src: 'doesnotexist.png' }]),
        resource: null
      })

      await recipe.scrape(container)

      expectMockDataToEqual(objContaining({ badges: [] }))
    })

    it('should cope with corrupt image', async () => {
      mockRequests(container.safeRequest, {
        readme: getReadme('foo', [{ src: 'corrupt.png' }]),
        resource: Buffer.from('corrupted image')
      })

      await recipe.scrape(container)

      expectMockDataToEqual(objContaining({ badges: [] }))
    })

    it('should ignore too large an image', async () => {
      mockRequests(container.safeRequest, {
        readme: getReadme('foo', [{ src: 'corrupt.png' }]),
        resource: helpers.readResourceFile('png.512x512.png')
      })

      await recipe.scrape(container)

      expectMockDataToEqual(objContaining({ badges: [] }))
    })

    it('should add extension to src if image src lacks it', async () => {
      mockRequests(container.safeRequest, {
        readme: getReadme('foo', [{ src: 'path/without_ext' }]),
        resource: helpers.readResourceFile('png.16x16.png')
      })

      await recipe.scrape(container)

      expectMockDataToEqual(objContaining({ badges: [objContaining({ src: 'user/name/path/without_ext.png' })] }))
    })
  })

  describe('debug filtering', () => {
    it('should allow .* to find all repos', async () => {
      process.env.DEBUG_FILTER_REPO = '.*'
      mockRequests(container.safeRequest)

      await recipe.scrape(container)

      expect(Object.keys(container.mockData).length).toEqual(1)
    })

    it('should allow filtering away all repos', async () => {
      process.env.DEBUG_FILTER_REPO = 'FOOBAR'
      mockRequests(container.safeRequest)

      await recipe.scrape(container)

      expect(Object.keys(container.mockData).length).toEqual(0)
    })
  })

  it('should raise InitializeError if repo list request reports 401', async () => {
    container.safeRequest.mockImplementation(() => { throw new StatusCodeError(401, helpers.bufferify(userReposData401)) })

    expect(recipe.scrape(container)).rejects.toBeInstanceOf(errors.InitializeError)
  })

  it('should fall back to wrapping the raw err if "user_repos" url promise fails without an error property', async () => {
    container.safeRequest.mockImplementation(() => { throw new Error('Oh no') })

    expect(recipe.scrape(container)).rejects.toBeInstanceOf(errors.InitializeError)
  })
})

const getReadme = (content, imgEntries = []) => {
  const htmlImages = imgEntries.map(el => {
    const canonicalAttr = el.canonical_src ? `data-canonical-src="${el.canonical_src}"` : ''
    let html = `<img src=${el.src} alt="${el.src}" ${canonicalAttr} style="max-width:100%;">`
    if (el.href) html = `<a target="_blank" href=${el.href}>${html}</a>`
    return html
  })

  return helpers.htmlify(`
    <div>
      <p>${content}</p>
      ${lo.isEmpty(htmlImages) ? '' : `<p>${htmlImages.join()}</p>`}
    </div>
  `)
}

const mockRequests = (...args) => helpers.mockRequests({
  user_repos: helpers.bufferify(userReposData200),
  readme: null
}, ...args)
