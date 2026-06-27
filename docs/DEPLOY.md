# デプロイ手順

cms は Vercel、web は Cloudflare Workers（静的アセット配信）。DB は Turso、画像は Cloudflare R2。
環境変数の一覧は `apps/cms/.env.example` / `apps/web/.env.example` を参照。

## 1. Turso（DB）

環境ごとに DB を分ける。preview の build でもスキーマ migration が走るため、本番とは別 DB を当てる。

```sh
turso db create satsuma-powder-prod
turso db create satsuma-powder-preview            # 空、または --from-db satsuma-powder-prod
turso db show satsuma-powder-prod --url           # libsql:// の URL
turso db tokens create satsuma-powder-prod        # auth token
```

## 2. R2（画像）

- バケットを作成し、公開アクセス用ドメインを設定する。r2.dev はレート制限があるため本番はカスタムドメイン推奨。
- S3 互換のアクセスキー（Access Key ID / Secret）を発行する。

## 3. cms → Vercel

- プロジェクトの Root Directory を `apps/cms` に設定（vercel.json には書けない項目）。
- `apps/cms/vercel.json` が framework=nextjs と buildCommand=`pnpm --filter cms ci`（`payload migrate` のあとに build）を持つ。
- 環境変数を Production / Preview で分けて設定する。
  - `DATABASE_URL`, `DATABASE_AUTH_TOKEN`（環境ごとの Turso）
  - `PAYLOAD_SECRET`
  - `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`（=auto）, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- デプロイすると build 時に `payload migrate` が走り、Turso にスキーマが作成される。

## 4. 初回データ投入（一度きり）

cms をデプロイしてスキーマが入ったあと、本番 Turso に対してデータを入れる。

1. デプロイ済みの `/admin` を開き、管理ユーザーを作成する（first-run 画面。`seed:admin` は本番では動かない）。
2. ローカルから本番 Turso を指す env（`DATABASE_URL` / `DATABASE_AUTH_TOKEN` / `PAYLOAD_SECRET` / `S3_*`）を設定して実行する。

```sh
WEB_API_KEY=<web の PAYLOAD_API_KEY と同じ値> pnpm --filter cms seed:api-key
GHOST_EXPORT=<ghost エクスポートの絶対パス> pnpm --filter cms migrate:ghost
```

`migrate:ghost` は記事・タグ・著者に加え、画像を R2 へ取り込み、SiteSettings / About グローバルも投入する（冪等）。

順序の注意: 管理ユーザーの作成（手順 1）は `seed:api-key` より前に行う。ユーザーが 1 人でも存在すると first-run 画面が出なくなる。

## 5. web → Cloudflare Workers

- `apps/web/wrangler.jsonc` の assets-only 構成。`dist` を静的配信し、`private.unsweets.net` を custom domain ルートに宣言。
- build は cms の API を読むため、以下を build 時の env として渡す（出力は静的なので runtime には残らない）。`apps/web/.env.deploy`（gitignored）にまとめておく。
  - `VITE_PAYLOAD_URL`（本番 cms の URL）
  - `PAYLOAD_API_KEY`（手順 4 の `WEB_API_KEY` と同じ値）
  - `VITE_R2_PUBLIC_URL`（R2 の公開ドメイン）
  - `VITE_SITE_URL`（公開 URL = https://private.unsweets.net）

```sh
pnpm --filter web deploy:prod        # scripts/deploy.sh: .env.deploy を読んで build && wrangler deploy
```

`scripts/deploy.sh` が `.env.deploy` を読み込んでビルド→デプロイする。`public/_redirects`（旧 URL → `/blog/:slug` ほか）は Workers の静的アセットでもそのまま効く。

初回の DNS 切替は Cloudflare dashboard で Worker に custom domain を追加（既存レコードを置換）。切替後はエッジに残る旧キャッシュを Purge する。

## 6. 確認

- cms: 認証なしの `/api/posts` が 403 を返す。
- 画像が R2 の公開ドメインから配信される。
- web: トップ / 記事 / `/rss.xml` / `/sitemap.xml` / OG 画像、旧 URL リダイレクトが動く。
