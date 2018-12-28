/* global describe, it, expect */
const htmlParser = require('../../lib/html-parsing')

describe('parseImages', () => {
  it('should be empty with no images', async () => {
    const images = await htmlParser.parseImages('<div/>')
    expect(images).toEqual([])
  })

  it('should extract image src', async () => {
    const images = await htmlParser.parseImages('<img src="src"/>')
    expect(images).toEqual([expect.objectContaining({ src: 'src' })])
  })

  it('should ignore non-link parent', async () => {
    const images = await htmlParser.parseImages('<foo href="href"><img src="src"/></foo>')
    expect(images).not.toEqual([expect.objectContaining({ href: 'href' })])
  })

  it('should extract parent link href', async () => {
    const images = await htmlParser.parseImages('<a href="href"><img/></a>')
    expect(images).toEqual([expect.objectContaining({ href: 'href' })])
  })

  it('should extract parent link canonical href', async () => {
    const images = await htmlParser.parseImages('<a><img data-canonical-src="foo"/></a>')
    expect(images).toEqual([expect.objectContaining({ canonical_src: 'foo' })])
  })

  it('should record attributes as undefined if they are not defined', async () => {
    const emptyEntry = {
      canonical_src: undefined,
      href: undefined,
      src: undefined
    }

    const images = await htmlParser.parseImages('<img/><a><img/></a><foo><img/></foo>')

    expect(images).toEqual([emptyEntry, emptyEntry, emptyEntry])
  })
})
