# Unsplash × feature image 統合プラン

Posts（および将来的に Tags）の `featureImage` に、Ghost のエディタにあるような「Unsplash を検索して画像を選ぶ」UX を Payload 管理画面へ追加するための設計メモ。

## 背景・前提

> ⚠️ 更新: 画像方針が「外部URL保持」→「全画像を `media` へ取り込み S3/R2 一本化」に変わった（[`docs/image-storage-r2.md`](./image-storage-r2.md)）。
> そのため `featureImage` は **`upload`(relationTo: media)** であり、もはや URL 文字列ではない。Unsplash 統合も
> 「URLを格納」ではなく「**選んだ写真を media へ取り込み、その media を featureImage に紐付ける**」形になる。

- 実装は未着手。本ドキュメントは方針のみ。
- 移行スクリプトの画像ダウンロード処理（`src/migrations/ghost/run.ts` の `ensureMedia` / `downloadImage`）と同じパターンを再利用できる。

## 0. 前提：Unsplash API キー取得（手動作業）

1. https://unsplash.com/developers で「New Application」を登録（無料・規約同意）。
2. 発行された **Access Key** を `.env` に追加：
   ```
   UNSPLASH_ACCESS_KEY=...
   ```
3. レート制限：初期は Demo（50 req/h）。公開運用時に Production 申請（5000 req/h）。

## 1. アーキテクチャ

```
[管理画面のカスタム Field コンポーネント]
        │ fetch（アクセスキーは送らない）
        ▼
[Payload custom endpoint /api/unsplash/search]  ← server 側でキーを使って Unsplash API へ
        │
        ▼  選んだ写真URLを useField で featureImage(text) にセット
```

ポイント：アクセスキーは **server 側のみ**で使い、クライアントには晒さない（proxy 経由）。

## 2. 具体ファイル

| ファイル | 役割 |
|---|---|
| `src/endpoints/unsplash.ts` | (1) 検索プロキシ: `Authorization: Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` で `https://api.unsplash.com/search/photos?query=&page=` を叩く。(2) 取り込み: 選択写真を server 側でダウンロード→`media` へ create→media ID を返す（`ensureMedia` 相当）。`payload.config.ts` の `endpoints` に登録 |
| `src/components/UnsplashPicker.tsx` | `'use client'`。検索ボックス＋結果サムネイルグリッド。選択時に取り込みエンドポイントを呼び、返った **media ID** を `@payloadcms/ui` の `useField({ path })` で `featureImage` にセット |
| `src/collections/Posts.ts` | `featureImage`(upload) に `admin.components.Field: 'src/components/UnsplashPicker#UnsplashPicker'` を追加（標準の upload UI を Unsplash 検索付きに差し替え） |
| `.env` / 配線 | `UNSPLASH_ACCESS_KEY` 追加 → `pnpm generate:importmap` でコンポーネント登録 |

→ `featureImage` は **upload(media)**。選んだ Unsplash 写真は media（=R2）へ取り込まれ、ストレージ一本化方針と整合する。ToS のクレジット情報は media のフィールド（例: `sourceUrl` や追加の photographer 系）に保存可能。

## 3. 実装順（MVP）

1. `.env` に `UNSPLASH_ACCESS_KEY` を設定。
2. proxy endpoint（`/api/unsplash/search`）を実装し `payload.config.ts` に登録。
3. `curl "http://localhost:3000/api/unsplash/search?q=cat"` で疎通確認。
4. `UnsplashPicker` コンポーネントを実装（検索→グリッド→選択で `useField` に URL セット、手入力欄併設）。
5. `Posts.ts` の `featureImage` に配線 → `pnpm generate:importmap`。
6. `pnpm dev` で「検索→選択→保存」を確認。

## 4. 将来の分岐（Unsplash 利用規約準拠にする場合）

MVP は規約の細部を省くが、公開運用では以下が必要：

- **クレジット保存**：規約は「写真家＋Unsplash へのリンク表記」を要求。
  これを満たすには `featureImage` を **単一URL → group**（例: `{ url, photographer, photographerUrl }`）へ拡張する設計判断が必要。← 後で要擦り合わせ。
- **ダウンロードトリガー**：画像選択時に Unsplash の `download_location` を叩く（API 規約）。proxy にもう1エンドポイント追加で対応。
- 検索結果のページング／無限スクロール。

## 5. 評価・補足

- **MVP は「中程度に簡単」＝半日規模**。`featureImage` が URL 文字列であることが効いている。
- 再利用容易：同じ `UnsplashPicker` を **Tags の `featureImage`**（既に Unsplash URL を運用中）にも流用可能。
- 関連実装パターン：Payload 3.x のカスタム Field component（`admin.components.Field`）、`useField`（`@payloadcms/ui`）、config-level `endpoints`。
