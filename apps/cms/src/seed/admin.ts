// Create a local-only admin user (idempotent). Refuses to run with NODE_ENV=production.
import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config'

const EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'password'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('🚫 seed:admin cannot run in production (NODE_ENV=production). Local testing only.')
    process.exit(1)
  }

  const payload = await getPayload({ config: await config })

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: EMAIL } },
    limit: 1,
  })
  if (existing.docs[0]) {
    console.log(`✔ admin user already exists: ${EMAIL} (no action taken)`)
    return
  }

  await payload.create({ collection: 'users', data: { email: EMAIL, password: PASSWORD } })
  console.log('✨ Created admin user for local testing')
  console.log(`   email:    ${EMAIL}`)
  console.log(`   password: ${PASSWORD}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
