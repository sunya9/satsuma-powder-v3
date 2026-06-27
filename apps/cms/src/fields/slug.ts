import { randomBytes } from 'crypto'
import type { Field } from 'payload'

// Used by Tags/Authors (slugField, name-derived). Payload's default slugify strips
// non-ASCII (its [^\w-] removes JP/CN letters); keep unicode letters/numbers.
export const slugify = ({ valueToSlugify }: { valueToSlugify?: unknown }): string =>
  String(valueToSlugify ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

// Posts: assign a short id when the slug is left blank (no manual entry needed).
// A custom slug can still be set for SEO.
export const autoIdSlug: Field = {
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: '空欄なら自動でIDを割り当てます。SEO用に任意で指定可。',
  },
  hooks: {
    beforeValidate: [({ value }) => value || randomBytes(8).toString('hex')],
  },
}
