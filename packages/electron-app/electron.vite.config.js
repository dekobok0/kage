// packages/electron-app/electron.vite.config.js
import { resolve } from 'path'
// ↓↓↓ externalizeDepsPlugin をインポートする
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
     // ↓↓↓ plugins を追加し、externalizeDepsPlugin を呼び出す
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.js')
        }
      },
      outDir: resolve(__dirname, 'dist/main')
    }
  },
  preload: {
    // ↓↓↓ plugins を追加し、externalizeDepsPlugin を呼び出す
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload.js')
        }
      },
      outDir: resolve(__dirname, 'dist/preload')
    }
  },
  renderer: {
    root: 'src',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.html')
        }
      },
      outDir: resolve(__dirname, 'dist/renderer')
    }
  }
})
