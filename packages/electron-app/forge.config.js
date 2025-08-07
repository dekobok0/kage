const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const fs = require('fs-extra'); // ★ 1. fs-extra をインポート
const path = require('path');   // ★ 2. path をインポート

module.exports = {
  packagerConfig: {
    asar: true,
    // extraResourcesは念のため残しますが、フックが主役です
    extraResources: [ './python_assets', './.env' ]
  },
  rebuildConfig: {},
  makers: [
    { name: '@electron-forge/maker-squirrel', config: {} },
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] },
    { name: '@electron-forge/maker-deb', config: {} },
    { name: '@electron-forge/maker-rpm', config: {} },
  ],
  plugins: [
    // (省略... FusesPlugin の部分は元のままでOK)
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  // ★★★ これが最後の解決策：postPackageフック ★★★
  hooks: {
    postPackage: async (forgeConfig, packageResult) => {
      console.info('--- postPackageフックを実行しています ---');
      
      for (const outputPath of packageResult.outputPaths) {
        // コピー元の場所 (プロジェクト内の python_assets フォルダ)
        const sourceDir = path.resolve(__dirname, 'python_assets');
        // コピー先の場所 (完成したアプリ内の resources フォルダ)
        const destDir = path.join(outputPath, 'resources', 'python_assets');

        console.info(`  コピー元: ${sourceDir}`);
        console.info(`  コピー先: ${destDir}`);

        try {
          if (await fs.pathExists(sourceDir)) {
            await fs.copy(sourceDir, destDir);
            console.info('--- ✅ python_assets のコピーに成功しました ---');
          } else {
            console.error(`--- ❌ コピー元フォルダが見つかりません: ${sourceDir} ---`);
            throw new Error(`Source directory not found: ${sourceDir}`);
          }
        } catch (err) {
          console.error('--- ❌ ファイルコピー中にエラーが発生しました ---', err);
          throw err;
        }
      }
    }
  }
};