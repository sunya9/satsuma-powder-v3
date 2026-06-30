import { describe, it, expect } from 'vitest'
import { canRunJobs } from '@/access/canRunJobs'

const SECRET = 's3cret-token'

describe('canRunJobs', () => {
  it('allows a logged-in user (regardless of secret)', () => {
    expect(canRunJobs({ hasUser: true, authHeader: null, secret: SECRET })).toBe(true)
    expect(canRunJobs({ hasUser: true, authHeader: null, secret: undefined })).toBe(true)
  })

  it('allows a matching Bearer token when there is no user', () => {
    expect(canRunJobs({ hasUser: false, authHeader: `Bearer ${SECRET}`, secret: SECRET })).toBe(true)
  })

  it('denies a wrong or missing token', () => {
    expect(canRunJobs({ hasUser: false, authHeader: 'Bearer nope', secret: SECRET })).toBe(false)
    expect(canRunJobs({ hasUser: false, authHeader: SECRET, secret: SECRET })).toBe(false)
    expect(canRunJobs({ hasUser: false, authHeader: null, secret: SECRET })).toBe(false)
  })

  it('denies everything (without a user) when CRON_SECRET is not configured', () => {
    expect(canRunJobs({ hasUser: false, authHeader: `Bearer ${SECRET}`, secret: undefined })).toBe(false)
    expect(canRunJobs({ hasUser: false, authHeader: 'Bearer ', secret: undefined })).toBe(false)
    expect(canRunJobs({ hasUser: false, authHeader: null, secret: '' })).toBe(false)
  })
})
