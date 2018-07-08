#!/usr/bin/env node
const errors = require('../lib/errors')
const fileutils = require('../lib/fileutils')
const scraper = require('../lib/index')

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
    yargs.option('c', {
      alias: 'cachefolder',
      default: scraper.defaultOptions.cachefolder,
      describe: 'Debug flag to set caching folder, defaults to temp. dir',
      type: 'string'
    })
  })
  .strict(true)
  .argv

scraper.main({
  cachefolder: argv.cachefolder,
  outfolder: argv.outfolder,
  recipe: argv.recipe
})
  .then(() => {
    return console.log('Done')
  })
  .catch(err => {
    if (err instanceof errors.InitializeError) {
      console.error(err.message)
      process.exit(2)
    } else {
      console.trace(err)
      process.exit(3)
    }
  })
