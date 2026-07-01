import { describe, it, expect, vi } from 'vitest'
import { triggerJobsRun } from '@/jobs/triggerJobsRun'

const okResponse = new Response('{}', { status: 200 })

describe('triggerJobsRun', () => {
  it('requests the payload jobs run endpoint with the cron secret', async () => {
    const fetch = vi.fn().mockResolvedValue(okResponse)

    await triggerJobsRun(
      { fetch },
      { serverURL: 'https://cms.example.com', cronSecret: 's3cret' },
    )

    expect(fetch).toHaveBeenCalledOnce()
    const request = fetch.mock.calls[0][0] as Request
    expect(request.url).toBe('https://cms.example.com/api/payload-jobs/run?limit=20')
    expect(request.method).toBe('GET')
    expect(request.headers.get('Authorization')).toBe('Bearer s3cret')
  })

  it('logs an error when the run endpoint responds non-ok', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('nope', { status: 500, statusText: 'Internal Server Error' }))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await triggerJobsRun({ fetch }, { serverURL: 'https://cms.example.com', cronSecret: 's3cret' })

    expect(error).toHaveBeenCalledWith('payload-jobs run failed: 500 Internal Server Error')
    error.mockRestore()
  })

  it('does not log on success', async () => {
    const fetch = vi.fn().mockResolvedValue(okResponse)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await triggerJobsRun({ fetch }, { serverURL: 'https://cms.example.com', cronSecret: 's3cret' })

    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})
