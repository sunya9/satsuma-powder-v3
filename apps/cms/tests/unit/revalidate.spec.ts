import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  shouldRevalidate,
  createAfterChangeRevalidate,
  createAfterDeleteRevalidate,
  createGlobalAfterChangeRevalidate,
} from '@/hooks/revalidate'

const HOOK_URL = 'https://api.cloudflare.com/client/v4/deploy-hook/test'

// The hook only uses req.payload.logger, so a minimal req stub is enough.
const makeReq = () => ({
  payload: {
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  },
})

describe('shouldRevalidate', () => {
  it('always returns true regardless of status when onlyPublished=false', () => {
    expect(shouldRevalidate({ onlyPublished: false, status: 'draft' })).toBe(true)
    expect(shouldRevalidate({ onlyPublished: false, status: undefined })).toBe(true)
  })

  it('onlyPublished=true: returns true when published', () => {
    expect(shouldRevalidate({ onlyPublished: true, status: 'published' })).toBe(true)
  })

  it('onlyPublished=true: returns true on unpublish (published to draft)', () => {
    expect(
      shouldRevalidate({ onlyPublished: true, status: 'draft', previousStatus: 'published' }),
    ).toBe(true)
  })

  it('onlyPublished=true: returns false when staying a draft (create/update)', () => {
    expect(shouldRevalidate({ onlyPublished: true, status: 'draft' })).toBe(false)
    expect(
      shouldRevalidate({ onlyPublished: true, status: 'draft', previousStatus: 'draft' }),
    ).toBe(false)
  })

  it('onlyPublished=true: returns false when status is unknown', () => {
    expect(shouldRevalidate({ onlyPublished: true })).toBe(false)
  })
})

describe('createAfterChangeRevalidate', () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_DEPLOY_HOOK_URL = HOOK_URL
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL
  })

  it('POSTs the deploy hook when a published post changes', async () => {
    const hook = createAfterChangeRevalidate({ onlyPublished: true })
    await hook({ doc: { _status: 'published' }, previousDoc: {}, req: makeReq() } as never)
    expect(fetch).toHaveBeenCalledWith(HOOK_URL, { method: 'POST' })
  })

  it('does not POST when saving a draft', async () => {
    const hook = createAfterChangeRevalidate({ onlyPublished: true })
    await hook({
      doc: { _status: 'draft' },
      previousDoc: { _status: 'draft' },
      req: makeReq(),
    } as never)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not POST and warns when the URL is not set', async () => {
    delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL
    const req = makeReq()
    const hook = createAfterChangeRevalidate()
    await hook({ doc: { _status: 'published' }, req } as never)
    expect(fetch).not.toHaveBeenCalled()
    expect(req.payload.logger.warn).toHaveBeenCalled()
  })

  it('does not throw when fetch fails (must not break saving)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    const req = makeReq()
    const hook = createAfterChangeRevalidate()
    await expect(hook({ doc: { _status: 'published' }, req } as never)).resolves.toBeDefined()
    expect(req.payload.logger.error).toHaveBeenCalled()
  })
})

describe('createAfterDeleteRevalidate', () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_DEPLOY_HOOK_URL = HOOK_URL
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL
  })

  it('POSTs when a published post is deleted', async () => {
    const hook = createAfterDeleteRevalidate({ onlyPublished: true })
    await hook({ doc: { _status: 'published' }, req: makeReq() } as never)
    expect(fetch).toHaveBeenCalledWith(HOOK_URL, { method: 'POST' })
  })

  it('does not POST when a draft is deleted', async () => {
    const hook = createAfterDeleteRevalidate({ onlyPublished: true })
    await hook({ doc: { _status: 'draft' }, req: makeReq() } as never)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('createGlobalAfterChangeRevalidate', () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_DEPLOY_HOOK_URL = HOOK_URL
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL
  })

  it('always POSTs on a global change', async () => {
    const hook = createGlobalAfterChangeRevalidate()
    await hook({ doc: {}, previousDoc: {}, req: makeReq() } as never)
    expect(fetch).toHaveBeenCalledWith(HOOK_URL, { method: 'POST' })
  })
})
