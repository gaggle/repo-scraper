const url = require('url')
const urljoin = require('url-join')

const errors = require('../lib/errors')
const { log } = require('../lib/log')

const DEFAULT_GL_URL = 'https://gitlab.com'

exports.initialize = async () => {
  log.warn('Gitlab scraping is WIP, please reach out as this project needs users to test the functionality')
  if (!process.env.GL_TOKEN) { throw new errors.InitializeError('Must specify GL_TOKEN environment variable') }
}

exports.scrape = async container => {
  const textRequest = async (...args) => {
    const buffer = await container.safeRequest(...args)
    return buffer.toString()
  }

  const apiBase = process.env.GL_URL || DEFAULT_GL_URL
  const headers = {
    Accept: 'application/json',
    'Private-Token': process.env.GL_TOKEN
  }

  let projects = JSON.parse(await textRequest('gl_projects', {
    url: url.parse(urljoin(apiBase, 'api/v4/projects?owned=true')), headers
  }))

  /**
   * It's useful during dev to limit the repos being processed,
   * so lets do a quick regex filtering via env. variable
   */
  if (process.env.DEBUG_FILTER_REPO) {
    projects = projects.filter(el => RegExp(process.env.DEBUG_FILTER_REPO).test(el.path_with_namespace))
  }

  await Promise.all(await projects.map(async el => {
    let languages = JSON.parse(await textRequest(`gl_languages/${el.path_with_namespace}`, {
      url: `${el._links.self}/languages`, headers
    }))

    let mergeRequests = JSON.parse(await textRequest(`gl_merge_request/${el.path_with_namespace}`, {
      url: el._links.merge_requests, headers
    }))

    await container.setRepoData(el.path_with_namespace, {
      badges: [],
      description: el.description,
      fullName: el.name_with_namespace,
      id: el.path_with_namespace,
      language: Object.keys(languages)[0],
      openIssues: el.open_issues_count,
      openIssuesHtmlUrl: `${el.web_url}/issues`,
      openPullrequests: mergeRequests.length,
      openPullrequestsHtmlUrl: `${el.web_url}/merge_requests`,
      ownerHtmlUrl: el.owner.web_url,
      ownerName: el.namespace.path,
      readmeHtml: null,
      repoHtmlUrl: el.web_url,
      repoName: el.path,
      scrapeRecipe: 'gitlab'
    })
  }))
}
