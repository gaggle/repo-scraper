#!/usr/bin/env node
const _prettyPath = require('../lib/pretty-path')
const errors = require('../lib/errors')
const fileutils = require('../lib/fileutils')
const scraper = require('../lib/index')
const {configureLog, getLogLevel, log} = require('../lib/log')

const prettyPath = (...args) => {
  return _prettyPath(...args, {alwaysAbsolute: log.getLevel() <= log.levels.DEBUG})
}

const argv = require('yargs')
  .usage('$0 <recipe>', 'Scrape repositories', yargs => {
    yargs.positional('recipe', {
      describe: `Which scraping-recipe to use, available: ${fileutils.getRecipeNames().join(', ')}`,
      type: 'string'
    })
    yargs.option('o', {
      alias: 'outfolder',
      default: scraper.defaultOptions.outfolder,
      describe: 'Folder to save static files to',
      type: 'string'
    })
    yargs.option('v', {
      alias: 'verbose',
      count: true,
      describe: 'Debug level count, corresponding to WARN, INFO, DEBUG, TRACE, SILENT'
    })
    yargs.option('c', {
      alias: 'cachefolder',
      default: scraper.defaultOptions.cachefolder,
      describe: 'Debug flag to set caching folder',
      type: 'string'
    })
  })
  .strict(true)
  .argv

const informUserStart = argv => {
  if (log.getLevel() !== log.levels.SILENT) {
    if (argv.verbose !== 0) console.log(`Log level ${getLogLevel()}`)
    console.log(`Scraping using '${argv.recipe}' recipe to '${prettyPath(argv.outfolder)}'`)
  }
  log.debug(`Caching to '${prettyPath(argv.cachefolder)}'`)
}

const onError = err => {
  if (err instanceof errors.InitializeError) {
    console.error(`Cannot start, got error: ${err.message}`)
    process.exit(2)
  } else {
    if (err.response) {
      const response = err.response.toJSON()
      response.body = response.body.toString()
      console.error(JSON.stringify(response))
      err.response = null
    }
    console.trace(err)
    process.exit(3)
  }
}

configureLog(argv.verbose)
Promise.resolve(informUserStart(argv))
  .then(() => scraper.main({
    cachefolder: argv.cachefolder,
    outfolder: argv.outfolder,
    recipe: argv.recipe
  }))
  .then(() => console.log('Done'))
  .catch(onError)
