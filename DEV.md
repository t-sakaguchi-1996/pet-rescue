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
npx expo start --offline
```

> `--offline` フラグは Expo CLI の起動時ネットワーク確認（`api.expo.dev` への接続）をスキップします。
> ネットワーク環境が問題ない場合は `npx expo start` でも起動できます。

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
EXPO_PUBLIC_FIREBASE_APP_ID=   # ← Web App ID を使用すること（Android App IDではない）
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

> **注意**: `EXPO_PUBLIC_FIREBASE_APP_ID` には Firebase コンソールの **ウェブアプリ** の App ID（`1:xxx:web:xxx` 形式）を設定してください。
> Android App ID（`1:xxx:android:xxx` 形式）を設定すると Firebase JS SDK が正常に動作しません。
> Webアプリの App ID は Webの `.env.local` の `NEXT_PUBLIC_FIREBASE_APP_ID` と同じ値を使います。

---

## Expo Go 制限事項

以下の機能は **Expo Go では動作しません**。EAS Build（実機ビルド）が必要です：

| 機能                   | 理由                                             |
| ---------------------- | ------------------------------------------------ |
| 地図表示（map.tsx）    | `react-native-maps` はネイティブモジュールのため |
| 投稿フォームの地図ピン | 同上。現在地ボタンは使用可能                     |
| プッシュ通知（FCM）    | ネイティブビルドが必要                           |

cd C:\Users\t_sak\Documents\GitHub\pet-rescue\packages\mobile
npm start

npm run web
