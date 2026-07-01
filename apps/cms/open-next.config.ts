import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

// Defaults are fine: no ISR/incremental cache to persist for the admin app.
export default defineCloudflareConfig({})
