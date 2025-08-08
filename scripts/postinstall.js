const fs = require('fs-extra');
const path = require('path');

console.log('Running postinstall script to handle electron dependency...');

// 各パスを絶対パスで解決
const rootNodeModules = path.resolve(__dirname, '../node_modules');
const electronAppPath = path.resolve(__dirname, '../packages/electron-app');

// コピー元とコピー先のパスを定義
const sourcePath = path.join(rootNodeModules, 'electron');
const destPath = path.join(electronAppPath, 'node_modules', 'electron');
const destDir = path.join(electronAppPath, 'node_modules');

try {
  // コピー元の 'electron' パッケージが存在するか確認
  if (fs.existsSync(sourcePath)) {
    // コピー先の 'node_modules' ディレクトリが存在しない場合は作成
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    console.log(`Copying 'electron' from ${sourcePath} to ${destPath}`);
    // electron パッケージを同期的にコピー（上書き）
    fs.copySync(sourcePath, destPath, { overwrite: true });
    console.log('Successfully copied electron package for Electron Forge.');
  } else {
    // Hoistingされた 'electron' が見つからない場合、警告を表示
    console.warn(`Warning: Hoisted 'electron' package not found at ${sourcePath}. The postinstall script did nothing.`);
  }
} catch (err) {
  console.error('Error during postinstall script:', err);
  process.exit(1);
}