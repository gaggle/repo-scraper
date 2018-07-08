/* global jest, describe, it, beforeEach, afterEach, expect */
const fs = require('fs-extra')
const lo = require('lodash')
const path = require('path')
const tmp = require('tmp-promise')

const Cached = require('../../lib/cached')
const CachedContainer = require('../../lib/cachedcontainer')
const fileutils = require('../../lib/fileutils')
const HtmlGetter = require('../../lib/htmlgetter')
const index = require('../../lib/index')
const recipe = require('../../recipes/github')

jest.mock('../../lib/cached')
jest.mock('../../lib/cachedcontainer')
jest.mock('../../lib/fileutils')
jest.mock('../../lib/htmlgetter')
jest.mock('../../recipes/github', () => ({
  initialize: jest.fn(),
  scrape: jest.fn()
}))

describe('main', () => {
  let tmpPath

  beforeEach(async () => {
    const o = await tmp.dir()
    tmpPath = o.path
    fileutils.getRecipe.mockImplementation(() => recipe)
  })

  afterEach(async () => {
    fs.remove(tmpPath)
    jest.clearAllMocks()
  })

  it('should initialize container with cache', async () => {
    await main()

    expect(Cached).toHaveBeenCalledTimes(1)
    expect(HtmlGetter).toHaveBeenCalledTimes(1)
    expect(CachedContainer).toHaveBeenCalledTimes(1)
  })

  it('should initialize and scrape parser', async () => {
    await main()

    expect(recipe.initialize).toHaveBeenCalledTimes(1)
    expect(recipe.scrape).toHaveBeenCalledTimes(1)
    expect(recipe.scrape).toHaveBeenCalledWith(CachedContainer.mock.instances[0])
  })

  it('should save container data', async () => {
    const outfolder = path.join(tmpPath, 'custom-static/')
    const filepath = path.join(outfolder, 'data.json')
    CachedContainer.mockImplementationOnce(() => ({data: {foo: 'bar'}}))

    await main({outfolder: outfolder})

    const ideal = JSON.stringify({foo: 'bar'}, null, 2)
    expect(await contentsOfFile(filepath)).toEqual(ideal)
  })

  it('should save container static files to outfolder', async () => {
    const outfolder = path.join(tmpPath, 'custom-static/')
    const staticFiles = {'foo.txt': Buffer.from('content')}
    CachedContainer.mockImplementationOnce(() => ({staticFiles: staticFiles}))

    await main({outfolder: outfolder})

    expect(fileutils.copyDataToDir).toBeCalledWith(outfolder, staticFiles)
  })

  const main = opts => {
    return index.main(lo.merge({
      cachefolder: path.join(tmpPath, 'cache/'),
      outfolder: path.join(tmpPath, 'static/'),
      recipe: 'github'
    }, opts))
  }

  const contentsOfFile = async fp => {
    const buffer = await fs.readFile(fp)
    return buffer.toString()
  }
})
