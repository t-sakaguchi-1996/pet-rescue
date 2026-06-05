const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// モノレポ対応: ワークスペースルートからパッケージを解決
config.watchFolders = [workspaceRoot, ...(config.watchFolders || [])]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// packages/web は Next.js プロジェクトで Metro が監視する必要はない。
// .next/static など存在しないパスを watch しようとしてクラッシュするため除外する。
// Windows (バックスラッシュ) / Unix (スラッシュ) 両方に対応したパターン。
config.resolver.blockList = [
  /[/\\]packages[/\\]web[/\\]/,
]

// react@18 (web用) がルートにホイストされているため、react-native が誤って
// React 18 を読み込みクラッシュする問題を修正。
// react / scheduler は常にモバイルパッケージ (React 19) のものを使う。
//
// また Metro は ESM import と CJS require で @firebase/app の異なるビルドを
// 選択する（ESM → dist/esm/index.esm2017.js、CJS → dist/index.cjs.js）。
// これにより _components が別インスタンスに分裂し、registerAuth した側と
// initializeApp した側が異なる Map を参照して
// "Component auth has not been registered yet" が発生する。
// @firebase/app を CJS ビルドに統一することで修正する。
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'react' ||
    moduleName.startsWith('react/') ||
    moduleName === 'scheduler' ||
    moduleName.startsWith('scheduler/')
  ) {
    try {
      const filePath = require.resolve(moduleName, { paths: [projectRoot] })
      return { filePath, type: 'sourceFile' }
    } catch {
      // モバイルに見つからなければデフォルト解決にフォールバック
    }
  }

  if (moduleName === '@firebase/app') {
    return {
      filePath: path.resolve(workspaceRoot, 'node_modules/@firebase/app/dist/index.cjs.js'),
      type: 'sourceFile',
    }
  }

  return context.resolveRequest(context, moduleName, platform)
}

// Expo RouterのAPP_ROOTを設定
process.env.EXPO_ROUTER_APP_ROOT = path.resolve(projectRoot, 'app')

module.exports = config
