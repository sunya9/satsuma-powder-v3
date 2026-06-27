// Create/refresh the build user whose API key the web SSG build uses to read the API.
// WEB_API_KEY must match the web build's PAYLOAD_API_KEY.
import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config'

const EMAIL = process.env.WEB_USER_EMAIL || 'web-build@example.com'
const API_KEY = process.env.WEB_API_KEY

async function main() {
  if (!API_KEY) throw new Error('WEB_API_KEY env is required')

  const payload = await getPayload({ config: await config })
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: EMAIL } },
    limit: 1,
  })

  if (existing.docs[0]) {
    await payload.update({
      collection: 'users',
      id: existing.docs[0].id,
      data: { enableAPIKey: true, apiKey: API_KEY },
    })
    console.log(`updated API-key user: ${EMAIL}`)
  } else {
    await payload.create({
      collection: 'users',
      data: { email: EMAIL, password: API_KEY, enableAPIKey: true, apiKey: API_KEY },
    })
    console.log(`created API-key user: ${EMAIL}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
