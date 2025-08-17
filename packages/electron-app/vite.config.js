import { defineConfig } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
  main: {
    build: {
      // ビルドの出力先を 'dist/main' に設定
      outDir: resolve(__dirname, 'dist/main')
    }
  },
  preload: {
    build: {
      // ビルドの出力先を 'dist/preload' に設定
      outDir: resolve(__dirname, 'dist/preload')
    }
  },
  renderer: {
    // レンダラープロセス用の設定 (今回は空のままでOK)
  }
});
