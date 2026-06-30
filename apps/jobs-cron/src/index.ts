// Cloudflare Cron worker: periodically triggers Payload's jobs runner so that
// scheduled publish/unpublish jobs actually execute. Vercel Hobby cron is too
// coarse, so this external cron calls the run endpoint with a Bearer CRON_SECRET
// (validated by jobs.access.run in the cms payload.config).
interface Env {
  CMS_URL: string
  CRON_SECRET: string
}

export default {
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const res = await fetch(`${env.CMS_URL}/api/payload-jobs/run?limit=20`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    })
    if (!res.ok) {
      console.error(`payload-jobs run failed: ${res.status} ${res.statusText}`)
    }
  },
} satisfies ExportedHandler<Env>
