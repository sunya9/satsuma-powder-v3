import { describe, it, expect } from 'vitest'

import { mapSendEmailOptions } from '@/email/map-send-options'

const DEFAULTS = { fromAddress: 'noreply@example.com', fromName: 'Satsuma CMS' }

describe('mapSendEmailOptions', () => {
  it('applies the default from when none is given', () => {
    const result = mapSendEmailOptions({ to: 'user@example.com', subject: 'Hi' }, DEFAULTS)
    expect(result.from).toEqual({ email: 'noreply@example.com', name: 'Satsuma CMS' })
    expect(result.to).toBe('user@example.com')
    expect(result.subject).toBe('Hi')
  })

  it('keeps a string from as-is', () => {
    const result = mapSendEmailOptions(
      { from: 'other@example.com', to: 'user@example.com', subject: 'Hi' },
      DEFAULTS,
    )
    expect(result.from).toBe('other@example.com')
  })

  it('maps a nodemailer Address ({ address }) to a Workers EmailAddress ({ email })', () => {
    const result = mapSendEmailOptions(
      {
        from: { name: 'Admin', address: 'admin@example.com' },
        to: [{ name: 'User', address: 'user@example.com' }, 'second@example.com'],
        subject: 'Hi',
      },
      DEFAULTS,
    )
    expect(result.from).toEqual({ email: 'admin@example.com', name: 'Admin' })
    expect(result.to).toEqual([{ email: 'user@example.com', name: 'User' }, 'second@example.com'])
  })

  it('passes subject, text and html through', () => {
    const result = mapSendEmailOptions(
      { to: 'user@example.com', subject: 'Reset', text: 'plain', html: '<p>rich</p>' },
      DEFAULTS,
    )
    expect(result.text).toBe('plain')
    expect(result.html).toBe('<p>rich</p>')
  })

  it('maps cc, bcc and replyTo', () => {
    const result = mapSendEmailOptions(
      {
        to: 'user@example.com',
        cc: 'cc@example.com',
        bcc: [{ name: 'Archive', address: 'archive@example.com' }],
        replyTo: 'support@example.com',
        subject: 'Hi',
      },
      DEFAULTS,
    )
    expect(result.cc).toBe('cc@example.com')
    expect(result.bcc).toEqual([{ email: 'archive@example.com', name: 'Archive' }])
    expect(result.replyTo).toBe('support@example.com')
  })

  it('defaults an empty subject to an empty string', () => {
    const result = mapSendEmailOptions({ to: 'user@example.com' }, DEFAULTS)
    expect(result.subject).toBe('')
  })

  it('maps attachments, using inline disposition when a cid is present', () => {
    const result = mapSendEmailOptions(
      {
        to: 'user@example.com',
        subject: 'Hi',
        attachments: [
          { filename: 'report.csv', content: 'a,b', contentType: 'text/csv' },
          { filename: 'logo.png', content: Buffer.from([1, 2]), contentType: 'image/png', cid: 'logo' },
        ],
      },
      DEFAULTS,
    )
    expect(result.attachments).toHaveLength(2)
    expect(result.attachments?.[0]).toMatchObject({
      filename: 'report.csv',
      type: 'text/csv',
      disposition: 'attachment',
      content: 'a,b',
    })
    expect(result.attachments?.[1]).toMatchObject({
      filename: 'logo.png',
      type: 'image/png',
      disposition: 'inline',
      contentId: 'logo',
    })
  })
})
