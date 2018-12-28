/* global jest, describe, it, beforeEach, afterEach, expect */
const { StatusCodeError } = require('request-promise-core/lib/errors.js')

describe('cli', () => {
  let errors
  let scraper

  beforeEach(async () => {
    errors = require('../../lib/errors')
    scraper = require('../../lib/index')

    jest.mock('../../lib/index', () => ({
      defaultOptions: jest.fn(),
      main: jest.fn()
    }))

    scraper.defaultOptions = {
      cachefolder: 'cachefolder/',
      outfolder: 'static/',
      recipe: undefined
    }

    global.process.argv = [process.execPath, __filename]
    global.process.exit = jest.fn()

    this.log = ''
    console['log'] = jest.fn(inputs => (this.log += inputs))
    this.errlog = ''
    console['error'] = jest.fn(inputs => (this.errlog += inputs))
  })

  afterEach(async () => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it('should exit 1 before calling main w. insufficient arguments', done => {
    process.exit.mockImplementationOnce(() => { throw new Error('exit') })
    scraper.main.mockImplementationOnce(async () => {})

    expect(() => { require('../../bin/cli') }).toThrow('exit')

    process.nextTick(() => {
      expect(scraper.main).not.toHaveBeenCalled()
      expect(process.exit).toHaveBeenCalledWith(1)
      done()
    })
  })

  it('should call main w. arguments', done => {
    setArgv('github')
    scraper.main.mockImplementationOnce(async () => {})

    require('../../bin/cli')

    process.nextTick(() => {
      expect(scraper.main).toHaveBeenCalledWith({
        cachefolder: scraper.defaultOptions.cachefolder,
        outfolder: scraper.defaultOptions.outfolder,
        recipe: 'github'
      })
      done()
    })
  })

  it('should log recipe name at default verbosity', done => {
    setArgv('github', '-vvv')
    scraper.main.mockImplementationOnce(async () => {})

    require('../../bin/cli')

    process.nextTick(() => {
      expect(this.log).toContain("Scraping using 'github' recipe")
      done()
    })
  })

  it('should log recipe name when increasing verbosity', done => {
    setArgv('github', '-vvvv')
    scraper.main.mockImplementationOnce(async () => {})

    require('../../bin/cli')

    process.nextTick(() => {
      expect(this.log).toContain("Scraping using 'github' recipe")
      done()
    })
  })

  it('should NOT log recipe name when increasing logging to silence', done => {
    setArgv('github', '-vvvvv')
    scraper.main.mockImplementationOnce(async () => {})

    require('../../bin/cli')

    process.nextTick(() => {
      expect(this.log).not.toContain("Scraping using 'github' recipe")
      done()
    })
  })

  it('should exit 0 w. valid arguments', done => {
    setArgv('github')
    scraper.main.mockImplementationOnce(async () => {})

    require('../../bin/cli')

    process.nextTick(() => {
      expect(scraper.main).toHaveBeenCalledTimes(1)
      expect(scraper.main).toHaveBeenCalledWith({
        cachefolder: scraper.defaultOptions.cachefolder,
        outfolder: scraper.defaultOptions.outfolder,
        recipe: 'github'
      })
      expect(process.exit).not.toHaveBeenCalled()
      done()
    })
  })

  it('should exit 2 on initializer error', done => {
    setArgv('github')
    scraper.main.mockImplementationOnce(() => Promise.reject(new errors.InitializeError()))

    require('../../bin/cli')

    process.nextTick(() => {
      expect(scraper.main).toHaveBeenCalledTimes(1)
      expect(process.exit).toHaveBeenCalledTimes(1)
      expect(process.exit).toHaveBeenCalledWith(2)
      done()
    })
  })

  it('should exit 3 on unknown errors', done => {
    setArgv('github')
    scraper.main.mockImplementationOnce(() => Promise.reject(new Error('Unknown!')))

    require('../../bin/cli')

    process.nextTick(() => {
      expect(scraper.main).toHaveBeenCalledTimes(1)
      expect(process.exit).toHaveBeenCalledTimes(1)
      expect(process.exit).toHaveBeenCalledWith(3)
      done()
    })
  })

  it('should exit 3 on error that contains response details', done => {
    setArgv('github')
    const response = fakeResponse(500, 'Oh no')
    scraper.main.mockImplementationOnce(() =>
      Promise.reject(
        new StatusCodeError(response.statusCode, 'Server error', {}, response)
      ))

    require('../../bin/cli')

    process.nextTick(() => {
      expect(scraper.main).toHaveBeenCalledTimes(1)
      expect(process.exit).toHaveBeenCalledTimes(1)
      expect(process.exit).toHaveBeenCalledWith(3)
      done()
    })
  })

  it('should print response details if error contains response details', done => {
    setArgv('github')
    const response = fakeResponse(500, 'Oh no')
    scraper.main.mockImplementationOnce(() =>
      Promise.reject(
        new StatusCodeError(response.statusCode, 'Server error', {}, response)
      ))

    require('../../bin/cli')

    process.nextTick(() => {
      expect(this.errlog).toContain('Oh no')
      done()
    })
  })
})

const fakeResponse = (status, body) => ({ toJSON: () => ({ body: Buffer.from(body), statusCode: status }) })

const setArgv = (...args) => {
  process.argv = [process.execPath, __filename, ...args]
}
