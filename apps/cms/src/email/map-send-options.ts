import type { SendEmailOptions } from 'payload'
import type { Address, Attachment } from 'nodemailer/lib/mailer'

// Builder-object overload of the send_email binding (see cloudflare-env.d.ts).
export type EmailSendParams = Exclude<Parameters<SendEmail['send']>[0], EmailMessage>

export interface FromDefaults {
  fromAddress: string
  fromName: string
}

// Nodemailer uses { name, address }; the Workers binding uses { name, email }.
function mapAddress(value: Address | string): string | EmailAddress {
  if (typeof value === 'string') return value
  return value.name ? { email: value.address, name: value.name } : value.address
}

function mapRecipients(
  value: SendEmailOptions['to'],
): string | EmailAddress | (string | EmailAddress)[] | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value.map(mapAddress) : mapAddress(value)
}

function mapContent(value: SendEmailOptions['text']): string | undefined {
  if (typeof value === 'string') return value
  // isView instead of instanceof: Buffer must be recognized across realms.
  // Streams are not supported by the binding.
  if (ArrayBuffer.isView(value)) return new TextDecoder().decode(value)
  return undefined
}

function mapAttachment(attachment: Attachment): EmailAttachment | undefined {
  const content =
    typeof attachment.content === 'string' || ArrayBuffer.isView(attachment.content)
      ? attachment.content
      : undefined
  if (content === undefined || typeof attachment.filename !== 'string') return undefined
  const base = {
    content,
    filename: attachment.filename,
    type: attachment.contentType ?? 'application/octet-stream',
  }
  return attachment.cid
    ? { ...base, disposition: 'inline', contentId: attachment.cid }
    : { ...base, disposition: 'attachment' }
}

export function mapSendEmailOptions(
  message: SendEmailOptions,
  defaults: FromDefaults,
): EmailSendParams {
  const from = message.from
    ? mapAddress(message.from)
    : { email: defaults.fromAddress, name: defaults.fromName }
  const replyTo = Array.isArray(message.replyTo) ? message.replyTo[0] : message.replyTo
  const attachments = message.attachments
    ?.map(mapAttachment)
    .filter((attachment): attachment is EmailAttachment => attachment !== undefined)

  return {
    from,
    // Payload always addresses someone; the binding rejects an empty `to` upstream.
    to: mapRecipients(message.to) ?? [],
    cc: mapRecipients(message.cc),
    bcc: mapRecipients(message.bcc),
    replyTo: replyTo ? mapAddress(replyTo) : undefined,
    subject: message.subject ?? '',
    text: mapContent(message.text),
    html: mapContent(message.html),
    attachments: attachments?.length ? attachments : undefined,
  }
}
