const fs = require('fs-extra')
const path = require('path')

const Cached = require('./cached')
const HtmlGetter = require('./htmlgetter')

const CachedContainer = require('./cachedcontainer')
const fileutils = require('./fileutils')
const sanitizer = require('./sanitizer')

exports.defaultOptions = {
  cache: '.cache/',
  outfile: 'data.json',
  outfolder: 'static/',
  recipe: undefined
}

exports.main = async (opts) => {
  const parser = fileutils.getRecipe(opts.recipe)

  const container = new CachedContainer({
    cache: new Cached(opts.cache),
    requestGetter: new HtmlGetter({maxAttempts: 5})
  })

  await parser.initialize(opts)
  await parser.scrape(container)

  await Promise.all([
    fs.ensureDir(path.dirname(opts.outfile))
      .then(() => fs.writeFile(
        opts.outfile,
        sanitizer.stableStringify(container.data)
      )),
    fs.ensureDir(opts.outfolder)
      .then(() => fileutils.copyDataToDir(
        opts.outfolder, container.staticFiles
      ))
  ])
}
