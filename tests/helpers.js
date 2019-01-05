const fs = require('fs')
const HtmlDom = require('htmldom')
const path = require('path')

exports.bufferify = (data) => Buffer.from(JSON.stringify(data))

exports.htmlify = s => {
  const html = new HtmlDom(s)
  return html.beautify()
}

exports.mockRequests = (defaultResponses, mockFn, responses) => {
  const actualResponses = { ...defaultResponses, ...responses }

  return mockFn
    .mockImplementation((cacheKey, payload) => {
      for (const key in actualResponses) {
        if (!actualResponses.hasOwnProperty(key)) continue
        if (cacheKey.includes(key)) {
          return actualResponses[key]
        }
      }
      throw new Error(`Unknown '${cacheKey}' request for: ${JSON.stringify(payload.url)}`)
    })
}

exports.readResourceFile = filename => {
  return fs.readFileSync(path.resolve(__dirname, `fixtures/resource-files/${filename}`))
}
