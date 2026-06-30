// Authorize the jobs run endpoint (/api/payload-jobs/run):
// logged-in admins may trigger it manually, otherwise require a Bearer token
// matching CRON_SECRET (sent by the external Cloudflare Cron worker).
export function canRunJobs(args: {
  hasUser: boolean
  authHeader: string | null
  secret?: string
}): boolean {
  if (args.hasUser) return true
  if (!args.secret) return false
  return args.authHeader === `Bearer ${args.secret}`
}
