const fs = require('fs-extra')
const path = require('path')

const Cached = require('./cached')
const CachedRequester = require('./cached-requester')
const fileutils = require('./fileutils')
const HtmlGetter = require('./htmlgetter')
const sanitizer = require('./sanitizer')

exports.defaultOptions = {
  cachefolder: '.cache/',
  outfolder: 'static/',
  recipe: undefined
}

exports.main = async (opts) => {
  const outfile = path.join(opts.outfolder, 'data.json')
  const parser = fileutils.getRecipe(opts.recipe)

  const container = new CachedRequester({
    cache: new Cached(opts.cachefolder),
    requestGetter: new HtmlGetter({ maxAttempts: 5 })
  })

  await parser.initialize(opts)
  await parser.scrape(container)

  await Promise.all([
    fs.ensureDir(path.dirname(outfile))
      .then(() => fs.writeFile(
        outfile,
        sanitizer.stableStringify(container.getData())
      )),
    fs.ensureDir(opts.outfolder)
      .then(() => fileutils.copyDataToDir(
        opts.outfolder, container.getStaticFiles()
      ))
  ])
}
