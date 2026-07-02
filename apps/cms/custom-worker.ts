// Wraps the OpenNext-generated worker to add a cron handler
// (see https://opennext.js.org/cloudflare/howtos/custom-worker).
// Excluded from tsconfig: .open-next/worker.js only exists after
// `opennextjs-cloudflare build`; wrangler bundles this file itself.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- only resolvable after `opennextjs-cloudflare build`, so expect-error would flip
// @ts-ignore generated file
import handler from './.open-next/worker.js'
import { triggerJobsRun } from './src/jobs/triggerJobsRun'

interface Env {
  SERVER_URL: string
  CRON_SECRET: string
  WORKER_SELF_REFERENCE: { fetch(request: Request): Promise<Response> }
}

const worker = {
  fetch: handler.fetch,

  async scheduled(_controller: unknown, env: Env): Promise<void> {
    await triggerJobsRun(env.WORKER_SELF_REFERENCE, {
      serverURL: env.SERVER_URL,
      cronSecret: env.CRON_SECRET,
    })
  },
}

export default worker
