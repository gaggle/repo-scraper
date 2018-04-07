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
      alias: 'cache',
      default: scraper.defaultOptions.cache,
      describe: 'Folder to use for caching',
      type: 'string'
    })
  })
  .strict(true)
  .argv

scraper.main({
  cache: argv.cache,
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
