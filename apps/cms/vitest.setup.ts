// CI has no .env; secrets come from the environment there.
try {
  process.loadEnvFile()
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

// Use a dedicated test DB so tests don't touch the dev DB. Override after .env is loaded.
process.env.DATABASE_URL = 'file:./test.db'
