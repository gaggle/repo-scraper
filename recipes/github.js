const lo = require('lodash')
const path = require('path')
const sizeOf = require('image-size')
const url = require('url')
const urljoin = require('url-join')

const errors = require('../lib/errors')
const htmlParser = require('../lib/html-parsing')
const sanitizer = require('../lib/sanitizer')
const {log} = require('../lib/log')

exports.initialize = async () => {
  if (!process.env.GH_TOKEN) { throw new errors.InitializeError('Must specify GH_TOKEN environment variable') }
}

exports.scrape = async container => {
  const scrapeBadgesFromReadme = async (repoEl, readme) => {
    const images = await htmlParser.parseImages(readme)
    return lo.compact(await Promise.all(images.map(async parsedEl => {
      let srcUri = url.parse(parsedEl.src)

      let downloadUri = srcUri
      if (!downloadUri.host) {
        const base = 'https://raw.githubusercontent.com'
        downloadUri = url.parse(urljoin(base, repoEl.full_name, 'master', downloadUri.path))
      }

      const resource = await container.safeRequest(`resource: ${parsedEl.canonical_src || downloadUri.href}`, downloadUri.href)

      if (!resource) return
      let size
      try {
        size = sizeOf(resource)
      } catch (err) {
        console.warn(`Error getting image size: ${JSON.stringify(parsedEl, null, 2)}`)
        return
      }
      if (size.width > 300 || size.height > 40) return

      let filepath
      if (srcUri.host) {
        const filename = sanitizer.hashify(srcUri.href)
        filepath = path.join(repoEl.full_name, filename)
      } else {
        filepath = path.join(repoEl.full_name, srcUri.pathname)
      }

      if (path.extname(filepath).indexOf(size.type) === -1) {
        filepath = `${filepath}.${size.type}`
      }

      await container.addStaticFile(filepath, resource)

      return {
        canonical_src: parsedEl.canonical_src || downloadUri.href,
        href: parsedEl.href,
        size: size,
        src: filepath
      }
    })))
  }

  const textRequest = async (...args) => {
    const buffer = await container.safeRequest(...args)
    return buffer ? buffer.toString() : buffer
  }

  const reposInfoRequest = textRequest('user_repos', {
    url: 'https://api.github.com/user/repos?per_page=100',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${process.env.GH_TOKEN}`
    }
  })
    .catch(err => {throw new errors.InitializeError(`${err.statusCode} ${err.error.toString()}`)})

  let reposInfo = JSON.parse(await reposInfoRequest)

  log.info(`Found ${reposInfo.length} repos`)

  /**
   * It's useful during dev to limit the repos being processed,
   * so lets do a quick regex filtering via env. variable
   */
  if (process.env.GH_DEBUG_FILTER_REPO) {
    reposInfo = reposInfo.filter(el => RegExp(process.env.GH_DEBUG_FILTER_REPO).test(el.full_name))
  }

  await Promise.all(await reposInfo.map(async el => {
    const readmeHtml = await textRequest(`readme: ${el.full_name}`, {
      url: `https://api.github.com/repos/${el.full_name}/readme`,
      headers: {
        Accept: 'application/vnd.github.v3.html',
        Authorization: `Token ${process.env.GH_TOKEN}`
      }
    })

    const badges = await scrapeBadgesFromReadme(el, readmeHtml)

    await container.setRepoData(el.full_name, {
      badges,
      description: el.description,
      full_name: el.full_name,
      id: el.full_name,
      language: el.language,
      open_issues: el.open_issues_count,
      open_issues_html_url: urljoin(el.html_url, 'issues'),
      open_pullrequests: el.open_issues_count,
      open_pullrequests_html_url: urljoin(el.html_url, 'pulls'),
      owner_html_url: el.owner.html_url,
      owner_name: el.owner.login,
      readme_html: readmeHtml,
      repo_html_url: el.html_url,
      repo_name: el.name
    })
  }))
}
