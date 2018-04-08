/* global jest, describe, it, beforeEach, afterEach, expect */
const lo = require('lodash')

const objContaining = expect.objectContaining

const Container = require('../../lib/cached-requester')
const errors = require('../../lib/errors')
const recipe = require('../../recipes/gitlab')

const languagesData = require('../fixtures/gitlab/api/v4/projects/2001/languages')
const mergeRequestsData = require('../fixtures/gitlab/api/v4/projects/2001/merge_requests')
const projectsData = require('../fixtures/gitlab/api/v4/projects/owned=true')

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

  it('should pass w. variables specified', async () => {
    process.env.GL_TOKEN = 'token'
    await expect(recipe.initialize()).resolves.toBe(undefined)
  })
})

describe('scrape', () => {
  const oldEnv = process.env
  let container

  beforeEach(() => {
    container = new Container()
    container.mockData = {}
    container.setRepoData.mockImplementation((key, d) => {
      if (container.mockData[key] === undefined) container.mockData[key] = {}
      lo.merge(container.mockData[key], d)
    })

    process.env = { ...oldEnv }
  })

  afterEach(() => { process.env = oldEnv })

  const expectMockDataToEqual = ideal => expect(container.mockData['gaggle/playground']).toEqual(ideal)

  it('should specify scrape recipe', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({ scrapeRecipe: 'gitlab' }))
  })

  it('should scrape unique id', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({ id: 'gaggle/playground' }))
  })

  it('should scrape basic repo information', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({
      description: 'This is a description',
      fullName: 'Jon Lauridsen / playground',
      ownerHtmlUrl: 'https://gitlab.com/gaggle',
      ownerName: 'gaggle',
      repoHtmlUrl: 'https://gitlab.com/gaggle/playground',
      repoName: 'playground'
    }))
  })

  it('should scrape issues', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({
      openIssues: 0,
      openIssuesHtmlUrl: 'https://gitlab.com/gaggle/playground/issues'
    }))
  })

  it('should scrape merge requests', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({
      openPullrequests: 1,
      openPullrequestsHtmlUrl: 'https://gitlab.com/gaggle/playground/merge_requests'
    }))
  })
  it('should scrape language', async () => {
    mockRequests(container.safeRequest)

    await recipe.scrape(container)

    expectMockDataToEqual(objContaining({
      language: 'JavaScript'
    }))
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
})

const bufferify = (data) => Buffer.from(JSON.stringify(data))

const mockRequests = (mockFn) => {
  return mockFn
    .mockImplementation((cacheKey, payload) => {
      if (cacheKey === 'gl_projects') {
        return bufferify(projectsData)
      }

      if (cacheKey.includes('gl_merge_request')) {
        return bufferify(mergeRequestsData)
      }

      if (cacheKey.includes('gl_languages')) {
        return bufferify(languagesData)
      }

      throw new Error(`Unknown request for ${payload.url}`)
    })
}
