// Create a local-only admin user (idempotent). Refuses to run with NODE_ENV=production.
import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config'

const EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'password'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('🚫 seed:admin は本番(NODE_ENV=production)では実行できません。ローカルテスト専用です。')
    process.exit(1)
  }

  const payload = await getPayload({ config: await config })

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: EMAIL } },
    limit: 1,
  })
  if (existing.docs[0]) {
    console.log(`✔ admin ユーザーは既に存在します: ${EMAIL}（何もしません）`)
    return
  }

  await payload.create({ collection: 'users', data: { email: EMAIL, password: PASSWORD } })
  console.log('✨ ローカルテスト用 admin を作成しました')
  console.log(`   email:    ${EMAIL}`)
  console.log(`   password: ${PASSWORD}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
