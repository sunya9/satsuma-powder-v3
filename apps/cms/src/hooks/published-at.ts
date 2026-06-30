import type { CollectionBeforeChangeHook } from 'payload'

// Pure decision: the value to assign to publishedAt, or undefined to leave it untouched.
export function resolvePublishedAt(args: {
  isPublished: boolean
  currentPublishedAt?: string | null
  now: string
}): string | undefined {
  if (args.isPublished && !args.currentPublishedAt) return args.now
  return undefined
}

// Stamp publishedAt the first time a post becomes published. An existing value is
// kept (incoming or from the stored doc), and unpublishing leaves it untouched.
export function createSetPublishedAt(): CollectionBeforeChangeHook {
  return ({ data, originalDoc }) => {
    const assign = resolvePublishedAt({
      isPublished: data?._status === 'published',
      currentPublishedAt: data?.publishedAt ?? originalDoc?.publishedAt,
      now: new Date().toISOString(),
    })
    if (assign) data.publishedAt = assign
    return data
  }
}
