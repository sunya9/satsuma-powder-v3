import { describe, it, expect, vi } from 'vitest'
import type { Payload } from 'payload'

import { cloudflareEmailAdapter } from '@/email/cloudflare-adapter'

const fakePayload = {} as Payload

function buildAdapter(send = vi.fn().mockResolvedValue({ messageId: 'mid-1' })) {
  const binding = { send } as unknown as SendEmail
  const adapter = cloudflareEmailAdapter({
    binding,
    defaultFromAddress: 'noreply@example.com',
    defaultFromName: 'Satsuma CMS',
  })({ payload: fakePayload })
  return { adapter, send }
}

describe('cloudflareEmailAdapter', () => {
  it('exposes name and from defaults for Payload', () => {
    const { adapter } = buildAdapter()
    expect(adapter.name).toBe('cloudflare-email')
    expect(adapter.defaultFromAddress).toBe('noreply@example.com')
    expect(adapter.defaultFromName).toBe('Satsuma CMS')
  })

  it('sends the mapped message through the binding', async () => {
    const { adapter, send } = buildAdapter()
    const result = await adapter.sendEmail({
      to: 'user@example.com',
      subject: 'Reset your password',
      html: '<p>link</p>',
    })

    expect(send).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        to: 'user@example.com',
        from: { email: 'noreply@example.com', name: 'Satsuma CMS' },
        subject: 'Reset your password',
        html: '<p>link</p>',
      }),
    )
    expect(result).toEqual({ messageId: 'mid-1' })
  })

  it('propagates binding errors to the caller', async () => {
    const send = vi.fn().mockRejectedValue(new Error('E_SENDER_NOT_VERIFIED'))
    const { adapter } = buildAdapter(send)
    await expect(
      adapter.sendEmail({ to: 'user@example.com', subject: 'Hi' }),
    ).rejects.toThrow('E_SENDER_NOT_VERIFIED')
  })
})
