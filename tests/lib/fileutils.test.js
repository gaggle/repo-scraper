/* global describe, it, beforeEach, afterEach, expect */
const fs = require('fs-extra')
const path = require('path')
const tmp = require('tmp-promise')

const fileutils = require('../../lib/fileutils')

describe('copyDataToDir', () => {
  let tmpPath

  beforeEach(async () => {
    const o = await tmp.dir()
    tmpPath = o.path
  })

  afterEach(async () => fs.remove(tmpPath))

  it('should create specified file', async () => {
    await fileutils.copyDataToDir(tmpPath, {'foo.txt': Buffer.from('content')})

    expect(await contentsOfTmpDir()).toEqual(['foo.txt'])
  })

  it('should write content to file', async () => {
    await fileutils.copyDataToDir(tmpPath, {'foo.txt': Buffer.from('content')})

    expect(await contentsOfTmpFile('foo.txt')).toEqual('content')
  })

  const contentsOfTmpFile = async filename => {
    const fp = path.join(tmpPath, filename)
    const buffer = await fs.readFile(fp)
    return buffer.toString()
  }

  const contentsOfTmpDir = async () => {
    return fs.readdir(tmpPath)
  }
})

describe('getRecipe', () => {
  it('should return GitHub scraper', () => {
    const module = fileutils.getRecipe('github')
    expect(module.initialize).toBeDefined()
    expect(module.scrape).toBeDefined()
  })
})

describe('getRecipeNames', () => {
  it('should return files in recipes folder', () => {
    expect(fileutils.getRecipeNames()).toEqual(['github'])
  })
})
