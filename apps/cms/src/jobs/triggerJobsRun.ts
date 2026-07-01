// Triggers Payload's jobs runner so scheduled publish/unpublish executes.
// Called from the Worker's cron (custom-worker.ts) through the
// WORKER_SELF_REFERENCE service binding, since a Worker cannot fetch() its
// own hostname directly.

interface Fetcher {
  fetch(request: Request): Promise<Response>
}

interface TriggerJobsRunOptions {
  serverURL: string
  cronSecret: string
}

export const triggerJobsRun = async (
  worker: Fetcher,
  { serverURL, cronSecret }: TriggerJobsRunOptions,
): Promise<void> => {
  const res = await worker.fetch(
    new Request(`${serverURL}/api/payload-jobs/run?limit=20`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    }),
  )
  if (!res.ok) {
    console.error(`payload-jobs run failed: ${res.status} ${res.statusText}`)
  }
}
