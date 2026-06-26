# 画像ストレージ（S3 / Cloudflare R2）と本番切替

すべての画像（記事の feature image / 著者画像 / 本文の `<img>`）を Payload の `media` コレクションへ取り込み、保存先を S3 / Cloudflare R2 に一本化する。外部URL（Firebase 等）への依存と互換レイヤーを排し、ストレージを一箇所に集約するための構成。

## 構成

- `payload.config.ts` に `@payloadcms/storage-s3` の `s3Storage` プラグインを配線済み。
  - `enabled: Boolean(process.env.S3_BUCKET)` — **env が未設定なら無効化**され、ローカルディスク `media/` へフォールバックする（dev はこれで動く）。
  - `forcePathStyle: true`（R2 / 多くの S3 互換ストレージで必要）。R2 は `region: 'auto'`、ACL は使わず Payload の配信ルート経由。
- `media` コレクションに `sourceUrl`（index 付き）を追加。移行時の**重複排除・冪等な再取り込み**に使う。
- 移行スクリプト `src/migrations/ghost/run.ts` が外部画像を**ダウンロード→media へ作成**し、entity の upload フィールドや本文の Lexical upload ノードへ ID 参照する。

## 必要な環境変数（`.env`）

```
S3_BUCKET=...
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com   # R2 の S3 互換エンドポイント
S3_REGION=auto                                              # R2 は auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

R2 側の準備：
1. Cloudflare で R2 バケットを作成。
2. R2 API トークン（アクセスキー/シークレット）を発行。
3. アカウントIDを使って `S3_ENDPOINT` を組み立てる。

## 本番（R2）への移行手順

ローカル検証（`media/` ディスクへ取り込み）は実施済み。本番の R2 へ実データを入れるときは、**R2 を保存先にした状態で一度だけ流す**：

1. `.env` に上記 S3_* を設定（`S3_BUCKET` が入ると s3Storage が有効化）。
2. 本番 DB（Turso）を使う場合は `DATABASE_URL=libsql://… ＋ DATABASE_AUTH_TOKEN` も設定。
3. **media コレクションを空の状態にして** `pnpm migrate:ghost` を実行（`sourceUrl` 重複排除があるため、既存 media があるとファイルが R2 へアップロードされず ID 参照だけ残る点に注意）。
4. 完了後、`media: created=… failed=…` のログと Admin で画像表示を確認。

> 補足: 保存先（ローカル⇄R2）を切り替える場合は、media を作り直してから再実行する。移行は Ghost ソースから何度でも再生成でき、`sourceUrl` により同一ストレージ内では冪等。

## 既知の挙動

- bookmark card のリンク内サムネイル画像は、Lexical の upload ノードをインライン位置に置けないため**本文には挿入されない**（ダウンロードは行われ media には残る／ログに枚数を出力）。
- 取得失敗（404 等）は**スキップ＋ログ**。参照は空になる（現状の実データでは failed=0）。
- 移行実測：media 163件 / posts 155 / tags 9 / authors 1、所要 約40秒（ローカル）。
