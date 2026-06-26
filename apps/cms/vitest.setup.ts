// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// 統合テストは専用の SQLite ファイル(test.db)を使う。
// 開発用 DB (satsuma-powder-admin.db) を汚さず、移行で投入した実データを保護するため。
// dotenv が .env の DATABASE_URL を読み込んだ後に上書きする。
process.env.DATABASE_URL = 'file:./test.db'
