# BFF Server - Kage Application

## 概要
KageアプリケーションのBFF（Backend for Frontend）サーバーです。AI機能とStripe決済機能を提供します。

## セットアップ

### 1. 環境変数の設定
プロジェクトルートに`.env`ファイルを作成し、以下の内容を追加してください：

```bash
# Stripe設定
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# サーバー設定
PORT=8080

# その他の設定
NODE_ENV=development
```

### 2. 本番環境での動作
配布版のElectronアプリは、自動的にCloud Run上のBFFサーバーに接続します：
- **開発時**: `http://localhost:8080`
- **配布版**: `https://kage-bff-server-266846393607.asia-northeast1.run.app`

環境変数の設定は不要です。

### 3. Stripe秘密鍵の取得
1. [Stripe Dashboard](https://dashboard.stripe.com/)にログイン
2. Developers > API keys から秘密鍵を取得
3. `.env`ファイルの`STRIPE_SECRET_KEY`に設定

### 4. サーバーの起動
```bash
npm run dev
```

## API エンドポイント

### POST /api/transcribe
音声文字起こしAPI

### POST /api/create-checkout-session
Stripe決済セッション作成API

**リクエスト:**
```json
{
  "priceId": "price_1RmYiIRhh0YbRyvV9bJG7N3v"
}
```

**レスポンス:**
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/..."
}
```

## 開発

### 依存関係
- Express.js
- Stripe
- Google Cloud Speech-to-Text
- CORS
- dotenv

### ポート
デフォルト: 8080
環境変数`PORT`で変更可能

### 設定ファイル
`config.js`でデフォルト設定を管理しています。
Stripeの秘密鍵が設定されていない場合、テスト用のキーが使用されます。
