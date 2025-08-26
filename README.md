# Kage Application - BFF実装完了

## 概要
Kageアプリケーションは、ElectronベースのAI面接支援ツールです。BFF（Backend for Frontend）アーキテクチャを採用し、セキュアな決済処理とAI機能を提供します。

## アーキテクチャ

### モノレポ構成
```
kage-app/
├── packages/
│   ├── electron-app/     # Electronクライアント
│   └── bff-server/       # BFFサーバー
├── archive/              # 技術文書
└── release/              # ビルド成果物
```

### BFF実装の特徴
- **セキュリティ**: Stripe秘密鍵をクライアントから分離
- **スケーラビリティ**: 独立したサーバーで決済処理
- **保守性**: 決済ロジックの一元管理

## セットアップ

### 1. 依存関係のインストール
```bash
# プロジェクトルートで実行
npm install

# BFFサーバーの依存関係
cd packages/bff-server
npm install
```

### 2. 環境変数の設定
BFFサーバー用の`.env`ファイルを作成：
```bash
cd packages/bff-server
# .envファイルを作成し、Stripe秘密鍵を設定
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
PORT=8080
NODE_ENV=development
```

**注意**: 配布版のElectronアプリは、自動的にCloud Run上のBFFサーバーに接続します。環境変数の設定は不要です。

### 3. サーバーの起動
```bash
# BFFサーバーを起動
cd packages/bff-server
npm run dev

# 別ターミナルでElectronアプリを起動
cd packages/electron-app
npm run start
```

## 機能

### AI機能
- リアルタイム音声文字起こし
- 面接支援AI

### 決済機能
- Stripe統合
- サブスクリプション管理
- セキュアな決済処理

### レポート機能
- PDFレポート生成
- 面接記録の保存

## 開発

### BFFサーバー
- Express.js + Node.js
- Stripe決済API
- Google Cloud Speech-to-Text

### Electronアプリ
- Electron + Vite
- セキュアなIPC通信
- 暗号化されたデータ保存

## セキュリティ

- Stripe秘密鍵はBFFサーバーでのみ管理
- クライアント-サーバー間はHTTPS通信
- データは暗号化して保存

## ライセンス
MIT License
