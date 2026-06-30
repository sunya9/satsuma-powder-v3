import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  shouldRevalidate,
  createAfterChangeRevalidate,
  createAfterDeleteRevalidate,
  createGlobalAfterChangeRevalidate,
} from '@/hooks/revalidate'

const HOOK_URL = 'https://api.cloudflare.com/client/v4/deploy-hook/test'

// hook は req.payload.logger しか使わないため、最小の req スタブで足りる。
const makeReq = () => ({
  payload: {
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  },
})

describe('shouldRevalidate', () => {
  it('onlyPublished=false なら status に関わらず常に true', () => {
    expect(shouldRevalidate({ onlyPublished: false, status: 'draft' })).toBe(true)
    expect(shouldRevalidate({ onlyPublished: false, status: undefined })).toBe(true)
  })

  it('onlyPublished=true: 公開中なら true', () => {
    expect(shouldRevalidate({ onlyPublished: true, status: 'published' })).toBe(true)
  })

  it('onlyPublished=true: 公開→非公開 (unpublish) なら true', () => {
    expect(
      shouldRevalidate({ onlyPublished: true, status: 'draft', previousStatus: 'published' }),
    ).toBe(true)
  })

  it('onlyPublished=true: 下書きのまま (新規/更新) なら false', () => {
    expect(shouldRevalidate({ onlyPublished: true, status: 'draft' })).toBe(false)
    expect(
      shouldRevalidate({ onlyPublished: true, status: 'draft', previousStatus: 'draft' }),
    ).toBe(false)
  })

  it('onlyPublished=true: status 不明なら false', () => {
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

  it('公開記事の変更で deploy hook を POST する', async () => {
    const hook = createAfterChangeRevalidate({ onlyPublished: true })
    await hook({ doc: { _status: 'published' }, previousDoc: {}, req: makeReq() } as never)
    expect(fetch).toHaveBeenCalledWith(HOOK_URL, { method: 'POST' })
  })

  it('下書き保存では POST しない', async () => {
    const hook = createAfterChangeRevalidate({ onlyPublished: true })
    await hook({
      doc: { _status: 'draft' },
      previousDoc: { _status: 'draft' },
      req: makeReq(),
    } as never)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('URL 未設定なら POST せず warn する', async () => {
    delete process.env.CLOUDFLARE_DEPLOY_HOOK_URL
    const req = makeReq()
    const hook = createAfterChangeRevalidate()
    await hook({ doc: { _status: 'published' }, req } as never)
    expect(fetch).not.toHaveBeenCalled()
    expect(req.payload.logger.warn).toHaveBeenCalled()
  })

  it('fetch が失敗しても throw しない (保存を壊さない)', async () => {
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

  it('公開記事の削除で POST する', async () => {
    const hook = createAfterDeleteRevalidate({ onlyPublished: true })
    await hook({ doc: { _status: 'published' }, req: makeReq() } as never)
    expect(fetch).toHaveBeenCalledWith(HOOK_URL, { method: 'POST' })
  })

  it('下書きの削除では POST しない', async () => {
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

  it('global 変更で常に POST する', async () => {
    const hook = createGlobalAfterChangeRevalidate()
    await hook({ doc: {}, previousDoc: {}, req: makeReq() } as never)
    expect(fetch).toHaveBeenCalledWith(HOOK_URL, { method: 'POST' })
  })
})
