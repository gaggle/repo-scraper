const crypto = require('crypto')
const stringify = require('json-stable-stringify')

exports.filenameify = (s) => s.replace(/[^a-z0-9]/gi, '_').toLowerCase()

exports.hashify = s => crypto.createHash('md5').update(s).digest('hex')

exports.stableStringify = (data) => stringify(data, {
  space: '  ',
  cmp: (a, b) =>
    // case-insensitive compare
    a.key.toLowerCase() < b.key.toLowerCase() ? -1 : 1
})
