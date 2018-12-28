/* global describe, it, expect */
const sanitizer = require('../../lib/sanitizer')

describe('filenameify', () => {
  it('should lowercase string', () => {
    expect(sanitizer.filenameify('FOO')).toEqual('foo')
  })

  it('should replace weird characters with underscores', () => {
    expect(sanitizer.filenameify('!@£$%^&*()_+á')).toEqual('_____________')
  })

  it('should preserve dots', () => {
    expect(sanitizer.filenameify('foo.bar')).toEqual('foo.bar')
  })

  it('should do nothing to a valid string', () => {
    expect(sanitizer.filenameify('foo')).toEqual('foo')
  })
})

describe('hashify', () => {
  it('should hash a string', () => {
    expect(sanitizer.hashify('foo')).toEqual('acbd18db4cc2f85cedef654fccc4a4d8')
  })
})

describe('stableStringify', () => {
  it('should stringify a string', () => {
    const result = sanitizer.stableStringify('foo')
    expect(result).toEqual('"foo"')
  })

  it('should stringify a hash with two spaces and newlines', () => {
    const result = sanitizer.stableStringify({ 'foo': 'bar' })
    expect(result).toEqual('{\n  "foo": "bar"\n}')
  })

  it('should alphabetize entries', () => {
    const result = sanitizer.stableStringify({ 'z': 'foo', 'a': 'foo' })
    expect(result).toEqual('{\n  "a": "foo",\n  "z": "foo"\n}')
  })

  it('should ignore casing when alphabetizing', () => {
    const result = sanitizer.stableStringify({ 'c': 'foo', 'a': 'foo', 'B': 'foo' })
    expect(result).toEqual('{\n  "a": "foo",\n  "B": "foo",\n  "c": "foo"\n}')
  })
})
