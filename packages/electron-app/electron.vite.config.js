// packages/electron-app/electron.vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.js')
        }
      },
      outDir: resolve(__dirname, 'dist/main'),
      // 外部モジュールのみを指定し、ローカルモジュールはバンドルする
      external: ['electron', 'electron-log', 'electron-store', 'puppeteer-core', 'stripe', 'dotenv', 'fs', 'path']
    }
  },
  preload: {
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
