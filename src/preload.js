// src/preload.js

const { contextBridge, ipcRenderer } = require('electron');

// 'api'という安全な橋を、レンダラー（UI）の世界に架ける
contextBridge.exposeInMainWorld('api', {
  /**
   * メインプロセスから 'from-python' チャンネルでデータが送られてきたときに、
   * 指定されたコールバック関数を実行するリスナーを設定する。
   * @param {function(data)} callback - データ受信時に実行される関数
   */
  onPythonData: (callback) => {
    ipcRenderer.on('from-python', (event, data) => callback(data));
  }
});// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
