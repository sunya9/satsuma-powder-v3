# satsuma-powder-v3

個人ブログ「粉蜜柑。」のソース。Ghost から移行した Payload CMS と、それをデータ源に静的生成するフロントエンドの monorepo。

## 構成

pnpm workspaces による monorepo。

- `apps/cms` — Payload CMS。管理画面とコンテンツ API を提供する。DB は SQLite（本番は Turso）、画像は Cloudflare R2。
- `apps/web` — HonoX + Tailwind のフロントエンド。ビルド時に cms の API を呼び、全ページを静的生成する（SSG）。

## 必要環境

Node.js 20.9 以上、pnpm 10。

## セットアップ

```sh
pnpm install
cp apps/cms/.env.example apps/cms/.env   # PAYLOAD_SECRET などを設定
cp apps/web/.env.example apps/web/.env    # PAYLOAD_API_KEY などを設定
```

cms を起動する（管理画面は http://localhost:3000/admin）。

```sh
pnpm dev
```

web は cms が起動している状態で動かす。読み取りは API キー認可のため、`seed:api-key` で発行したキーを `apps/web/.env` の `PAYLOAD_API_KEY` に設定しておく。

```sh
pnpm --filter web dev
```

## コマンド

| コマンド | 内容 |
| --- | --- |
| `pnpm typecheck` | 両アプリの型チェック |
| `pnpm lint` | cms の lint |
| `pnpm test` | cms のテスト |
| `pnpm --filter web build` | フロントの静的生成（cms 起動が前提） |
| `pnpm migrate:ghost` | Ghost のエクスポートを Payload へ取り込む（冪等） |
| `pnpm --filter cms migrate` | DB へスキーマ migration を適用 |

## デプロイ

CD は各プラットフォームの Git 連携に委ねる。

- `apps/cms` → Vercel。Root Directory を `apps/cms` に設定する（プロジェクト設定）。ビルド設定は `apps/cms/vercel.json`（`buildCommand` = `pnpm --filter cms run ci`。`payload migrate` のあとに build）。
- `apps/web` → Cloudflare Workers の静的アセット配信。`pnpm --filter web deploy:prod`（build 後に `wrangler deploy`）。設定は `apps/web/wrangler.jsonc`。

CI（typecheck / lint / test）は GitHub Actions（`.github/workflows/ci.yml`）で実行する。

手順の詳細は [`docs/DEPLOY.md`](docs/DEPLOY.md) を参照。
