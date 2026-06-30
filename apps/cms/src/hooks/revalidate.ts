import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  Payload,
} from 'payload'

type RevalidateOptions = {
  // Posts only: skip rebuilds while a doc stays in draft.
  onlyPublished?: boolean
}

type RevalidateDecision = {
  onlyPublished?: boolean
  status?: string
  previousStatus?: string
}

// Pure decision: should this change trigger a Cloudflare SSG rebuild?
export function shouldRevalidate({
  onlyPublished,
  status,
  previousStatus,
}: RevalidateDecision): boolean {
  if (!onlyPublished) return true
  // Published now, or just unpublished (published -> draft): both need a rebuild
  // so the site reflects the addition or removal.
  return status === 'published' || previousStatus === 'published'
}

// Fire the Cloudflare Workers Builds Deploy Hook to rebuild the SSG site.
// Never throws: a failed notification must not fail the underlying CMS write.
async function triggerDeploy(payload: Payload): Promise<void> {
  const url = process.env.CLOUDFLARE_DEPLOY_HOOK_URL
  if (!url) {
    payload.logger.warn('CLOUDFLARE_DEPLOY_HOOK_URL is not set; skipping SSG revalidation')
    return
  }
  try {
    const res = await fetch(url, { method: 'POST' })
    if (!res.ok) {
      payload.logger.error(
        `SSG revalidation deploy hook failed: ${res.status} ${res.statusText}`,
      )
    }
  } catch (err) {
    payload.logger.error({ err }, 'SSG revalidation deploy hook request threw')
  }
}

export function createAfterChangeRevalidate(
  options: RevalidateOptions = {},
): CollectionAfterChangeHook {
  return async ({ doc, previousDoc, req }) => {
    if (
      shouldRevalidate({
        onlyPublished: options.onlyPublished,
        status: doc?._status,
        previousStatus: previousDoc?._status,
      })
    ) {
      await triggerDeploy(req.payload)
    }
    return doc
  }
}

export function createAfterDeleteRevalidate(
  options: RevalidateOptions = {},
): CollectionAfterDeleteHook {
  return async ({ doc, req }) => {
    if (shouldRevalidate({ onlyPublished: options.onlyPublished, status: doc?._status })) {
      await triggerDeploy(req.payload)
    }
    return doc
  }
}

export function createGlobalAfterChangeRevalidate(
  options: RevalidateOptions = {},
): GlobalAfterChangeHook {
  return async ({ doc, previousDoc, req }) => {
    if (
      shouldRevalidate({
        onlyPublished: options.onlyPublished,
        status: doc?._status,
        previousStatus: previousDoc?._status,
      })
    ) {
      await triggerDeploy(req.payload)
    }
    return doc
  }
}
