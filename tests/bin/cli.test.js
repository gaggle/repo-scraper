/* global jest, describe, it, beforeEach, afterEach, expect */
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
      cache: 'cache/',
      outfolder: 'static/',
      recipe: undefined
    }

    global.process.argv = [process.execPath, __filename]
    global.process.exit = jest.fn()
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
        cache: scraper.defaultOptions.cache,
        outfolder: scraper.defaultOptions.outfolder,
        recipe: 'github'
      })
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
        cache: scraper.defaultOptions.cache,
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
})

const setArgv = (...args) => {
  process.argv = [process.execPath, __filename, ...args]
}
