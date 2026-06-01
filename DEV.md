# 開発コマンド

## 事前準備（初回のみ）

```powershell
# リポジトリ直下で依存パッケージをインストール
npm install
```

---

## Web サーバー

### 起動

```powershell
# リポジトリ直下から実行
npm run web
```

または

```powershell
# packages/web ディレクトリから実行
cd packages/web
npm run dev
```

- アクセス先: http://localhost:3000
- ビルドモード: webpack（デフォルト）
- Turbopack を使う場合: `npm run dev:turbo`

### ビルド・本番起動

```powershell
npm run build:web        # ビルド
cd packages/web && npm start  # 本番サーバー起動
```

---

## モバイルアプリ（Expo Go）

### QR コード発行・起動

```powershell
# リポジトリ直下から実行
npm run mobile
```

または

```powershell
# packages/mobile ディレクトリから実行
cd packages/mobile
npx expo start
```

- ターミナルに QR コードが表示される
- スマートフォンの **Expo Go** アプリで QR コードを読み取る
- iOS: App Store で「Expo Go」をインストール
- Android: Google Play で「Expo Go」をインストール

### プラットフォーム指定起動

```powershell
npm run mobile:android   # Android エミュレーター
npm run mobile:ios       # iOS シミュレーター（Mac のみ）
```

---

## Firestore インデックス・セキュリティルールのデプロイ

初回または `firestore.indexes.json` / `firestore.rules` 変更後に実行。

```powershell
# firebase-tools が未インストールの場合
npm install -g firebase-tools

# Firebase にログイン（初回のみ）
firebase login

# プロジェクトを選択
firebase use pet-rescue-9f570

# デプロイ
firebase deploy --only firestore:indexes,firestore:rules
```

---

## 環境変数

### Web (`packages/web/.env.local`)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

### モバイル (`packages/mobile/.env`)

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```
