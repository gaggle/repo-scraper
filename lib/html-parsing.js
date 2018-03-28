const HtmlDom = require('htmldom')

exports.parseImages = async (htmlStr) => {
  const html = new HtmlDom(htmlStr)
  const $ = html.$

  return Array.from($('img')).map(imgEl => {
    const aEl = imgEl.parent.name === 'a' ? imgEl.parent : null
    return {
      canonical_src: imgEl.attributes['data-canonical-src'],
      href: aEl ? aEl.attributes['href'] : undefined,
      src: imgEl.attributes['src'],
    }
  })
}
