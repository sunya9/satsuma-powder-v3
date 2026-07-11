import type { EmailAdapter } from 'payload'

import { mapSendEmailOptions } from './map-send-options'

export interface CloudflareEmailAdapterArgs {
  binding: SendEmail
  defaultFromAddress: string
  defaultFromName: string
}

// Payload email adapter backed by the Cloudflare Workers send_email binding.
// No API keys involved: the binding is granted through wrangler.jsonc and the
// from domain must be onboarded to Email Sending.
export function cloudflareEmailAdapter({
  binding,
  defaultFromAddress,
  defaultFromName,
}: CloudflareEmailAdapterArgs): EmailAdapter<EmailSendResult> {
  return () => ({
    name: 'cloudflare-email',
    defaultFromAddress,
    defaultFromName,
    sendEmail: (message) =>
      binding.send(
        mapSendEmailOptions(message, { fromAddress: defaultFromAddress, fromName: defaultFromName }),
      ),
  })
}
