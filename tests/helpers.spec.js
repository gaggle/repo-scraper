/* global jest, describe, it, expect */
const helpers = require('./helpers')

describe('mockRequests', () => {
  it('allows mock to be called with key defined via defaultResponses', () => {
    const mock = jest.fn()
    helpers.mockRequests({ key: 'foo' }, mock)

    expect(
      mock('key', { url: 'url' })
    ).toEqual('foo')
  })

  it('allows mock to be called with key defined via responses', () => {
    const mock = jest.fn()
    helpers.mockRequests({}, mock, { key: 'bar' })

    expect(
      mock('key', { url: 'url' })
    ).toEqual('bar')
  })

  it('raises error if called with unimplemented key', () => {
    const mock = jest.fn()
    helpers.mockRequests({}, mock, {})

    expect(() => {
      mock('key', { url: 'url' })
    }).toThrow(Error)
  })
})
