import { pino } from 'pino'

// Payload's default logger hardcodes pino-pretty with colorize: true, which
// Workers Logs renders as escape garbage. Use a plain-JSON pino instance
// instead, dispatched through console so Workers Logs keeps per-level severity.
export function createCloudflareLogger(level = process.env.PAYLOAD_LOG_LEVEL || 'info') {
  return pino(
    // base: undefined drops the pid/hostname fields (meaningless on workerd).
    { level, base: undefined },
    {
      write(line: string) {
        const text = line.trimEnd()
        let numLevel = 30
        try {
          numLevel = (JSON.parse(text) as { level?: number }).level ?? 30
        } catch {
          // Not JSON somehow: still log the raw line at default severity.
        }
        if (numLevel >= 50) console.error(text)
        else if (numLevel >= 40) console.warn(text)
        else console.log(text)
      },
    },
  )
}

export const cloudflareLogger = createCloudflareLogger()
