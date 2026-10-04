// @vitest-environment node
// payload.config now boots wrangler getPlatformProxy, which breaks under jsdom.
import { getPayload, handleEndpoints, Payload, type SanitizedConfig } from 'payload'
import config from '@/payload.config'
import { buildPreviewPath, derivePreviewKey } from '@/fields/preview'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

const API_KEY = 'preview-verify-int-api-key'
const EMAIL = 'preview-verify-int@example.com'
const PASSWORD = 'preview-verify-int-password'

let payload: Payload
let payloadConfig: SanitizedConfig

async function mintToken(slug: string): Promise<string> {
  const url = await buildPreviewPath({
    webUrl: 'https://web.example.com',
    slug,
    secret: await derivePreviewKey(payload.secret),
    now: Date.now(),
  })
  return new URL(url!).searchParams.get('token')!
}

// Goes through Payload's real REST router (the same entry the Next route uses),
// so this also proves the custom endpoint wins over the default `/:id` route.
function verify(params: Record<string, string>, authorization?: string): Promise<Response> {
  const url = new URL('http://localhost:3000/api/posts/preview-token/verify')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const headers = new Headers()
  if (authorization) headers.set('Authorization', authorization)
  return handleEndpoints({ config: payloadConfig, request: new Request(url, { headers }) })
}

async function deleteTestUser() {
  await payload.delete({ collection: 'users', where: { email: { equals: EMAIL } } })
}

describe('GET /api/posts/preview-token/verify', () => {
  beforeAll(async () => {
    payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
    await deleteTestUser()
    await payload.create({
      collection: 'users',
      data: { email: EMAIL, password: PASSWORD, enableAPIKey: true, apiKey: API_KEY },
    })
  })

  afterAll(async () => {
    await deleteTestUser()
  })

  it('returns 401 without credentials, even for a valid token', async () => {
    const res = await verify({ slug: 'some-draft', token: await mintToken('some-draft') })
    expect(res.status).toBe(401)
  })

  it('returns 404 for a bad token with a valid API key', async () => {
    const res = await verify(
      { slug: 'some-draft', token: '1.deadbeef' },
      `users API-Key ${API_KEY}`,
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 for a token minted for another slug', async () => {
    const res = await verify(
      { slug: 'some-draft', token: await mintToken('other-draft') },
      `users API-Key ${API_KEY}`,
    )
    expect(res.status).toBe(404)
  })

  it('returns 200 for a token minted with the PAYLOAD_SECRET-derived key (API key)', async () => {
    const res = await verify(
      { slug: 'some-draft', token: await mintToken('some-draft') },
      `users API-Key ${API_KEY}`,
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 200 for a logged-in user (JWT)', async () => {
    const { token: jwt } = await payload.login({
      collection: 'users',
      data: { email: EMAIL, password: PASSWORD },
    })
    const res = await verify(
      { slug: 'some-draft', token: await mintToken('some-draft') },
      `JWT ${jwt}`,
    )
    expect(res.status).toBe(200)
  })
})
