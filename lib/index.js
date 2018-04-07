const fs = require('fs-extra')
const path = require('path')

const Cached = require('./cached')
const CachedContainer = require('./cachedcontainer')
const fileutils = require('./fileutils')
const HtmlGetter = require('./htmlgetter')
const sanitizer = require('./sanitizer')

exports.defaultOptions = {
  cache: '.cache/',
  outfolder: 'static/',
  recipe: undefined
}

exports.main = async (opts) => {
  const outfile = path.join(opts.outfolder, 'data.json')
  const parser = fileutils.getRecipe(opts.recipe)

  const container = new CachedContainer({
    cache: new Cached(opts.cache),
    requestGetter: new HtmlGetter({maxAttempts: 5})
  })

  await parser.initialize(opts)
  await parser.scrape(container)

  await Promise.all([
    fs.ensureDir(path.dirname(outfile))
      .then(() => fs.writeFile(
        outfile,
        sanitizer.stableStringify(container.data)
      )),
    fs.ensureDir(opts.outfolder)
      .then(() => fileutils.copyDataToDir(
        opts.outfolder, container.staticFiles
      ))
  ])
}
