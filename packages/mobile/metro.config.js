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

// react@18 (web用) がルートにホイストされているため、react-native が誤って
// React 18 を読み込みクラッシュする問題を修正。
// react / scheduler は常にモバイルパッケージ (React 19) のものを使う。
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
  return context.resolveRequest(context, moduleName, platform)
}

// Expo RouterのAPP_ROOTを設定
process.env.EXPO_ROUTER_APP_ROOT = path.resolve(projectRoot, 'app')

module.exports = config
