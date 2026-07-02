import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCloudflareLogger } from '@/logger'

describe('createCloudflareLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes info as one-line JSON via console.log', () => {
    createCloudflareLogger().info('hello')
    expect(console.log).toHaveBeenCalledOnce()
    const line = vi.mocked(console.log).mock.calls[0][0] as string
    const parsed = JSON.parse(line)
    expect(parsed.msg).toBe('hello')
    expect(parsed.level).toBe(30)
  })

  it('routes warn/error to the matching console method', () => {
    const logger = createCloudflareLogger()
    logger.warn('careful')
    logger.error('boom')
    expect(console.warn).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledOnce()
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0] as string).msg).toBe('boom')
  })

  it('merges object fields into the JSON line', () => {
    createCloudflareLogger().error({ err: 'boom' }, 'failed')
    const parsed = JSON.parse(vi.mocked(console.error).mock.calls[0][0] as string)
    expect(parsed.err).toBe('boom')
    expect(parsed.msg).toBe('failed')
  })

  it('respects the configured level', () => {
    createCloudflareLogger('warn').info('quiet')
    expect(console.log).not.toHaveBeenCalled()
  })

  it('emits no ANSI escape sequences', () => {
    createCloudflareLogger().info('colored?')
    const line = vi.mocked(console.log).mock.calls[0][0] as string
    expect(line).not.toContain(String.fromCharCode(27))
  })
})
