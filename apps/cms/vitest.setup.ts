// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// Use a dedicated test DB so tests don't touch the dev DB. Override after dotenv loads .env.
process.env.DATABASE_URL = 'file:./test.db'
