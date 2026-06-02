# ペットレスキュー - セットアップガイド

## 必要な外部サービス

### 1. Firebase プロジェクト作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. 以下のサービスを有効化:
   - Authentication (メール/パスワード)
   - Firestore Database
   - Storage
   - Cloud Messaging (FCM)

### 2. Google Maps API キー取得

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成/選択
2. 以下のAPIを有効化:
   - Maps JavaScript API (Web用)
   - Maps SDK for Android / iOS (モバイル用)
3. APIキーを作成・コピー

---

## Web アプリのセットアップ

```bash
cd packages/web
cp .env.local.example .env.local
```

`.env.local` にFirebaseの設定値とGoogle Maps APIキーを記入:

```
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
NEXT_PUBLIC_FIREBASE_VAPID_KEY=xxx  # Cloud Messaging > ウェブ設定 > キーペア
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxx
```

### 開発サーバー起動

```bash
# ルートから
npm run web

# または packages/web から
npm run dev
```

### Firebaseデプロイ

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

---

## モバイルアプリのセットアップ

### Firebase設定ファイルの配置

**Android:**

1. Firebase Console > プロジェクト設定 > Android アプリを追加
2. パッケージ名: `com.petrescue.app`
3. `google-services.json` をダウンロード
4. `packages/mobile/google-services.json` に配置

**iOS:**

1. Firebase Console > プロジェクト設定 > iOS アプリを追加
2. バンドルID: `com.petrescue.app`
3. `GoogleService-Info.plist` をダウンロード
4. `packages/mobile/GoogleService-Info.plist` に配置

### 依存関係インストール

```bash
cd packages/mobile
npm install
```

### 開発サーバー起動

```bash
npm run start
# または
npm run android  # Androidエミュレーター
npm run ios      # iOSシミュレーター
```

### EASビルド（実機/ストア用）

```bash
npm install -g eas-cli
eas login
eas build --platform android
eas build --platform ios
```

---

## Firebaseルールのデプロイ

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

---

## プロジェクト構成

```
pet-rescue/
├── packages/
│   ├── shared/          # 共有型定義
│   ├── web/             # Next.js Webアプリ
│   └── mobile/          # Expo React Nativeアプリ
├── firestore.rules      # Firestoreセキュリティルール
├── storage.rules        # Storageセキュリティルール
├── firestore.indexes.json
└── firebase.json
```

---

## 機能一覧

- [x] 迷子ペット投稿（写真・場所・詳細情報）
- [x] ペット一覧表示（種別・動物種・都道府県フィルタ）
- [x] ペット詳細ページ
- [x] Google Mapsで場所確認
- [x] 地図上でペット情報を一覧表示
- [x] ユーザー認証（メール/パスワード）
- [x] プッシュ通知（FCM）
- [x] iOS / Android アプリ
