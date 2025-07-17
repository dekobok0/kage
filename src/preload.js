// src/preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onPythonData: (callback) => {
    ipcRenderer.on('from-python', (event, data) => callback(data));
  },
  // ▼▼▼ この関数を追加 ▼▼▼
  /**
   * プロフィールデータをメインプロセスに送信して保存を要求する
   * @param {object} profileData - { characteristics, resume }
   */
  saveProfile: (profileData) => {
    ipcRenderer.send('save-profile', profileData);
  },
  // ▼▼▼ この関数を追加 ▼▼▼
  /**
   * メインプロセスからロードされたプロフィールデータを受け取るリスナー
   * @param {function(profileData)} callback
   */
  onProfileLoaded: (callback) => {
    // 'once' を使うことで、アプリ起動時に一度だけデータを受け取る
    ipcRenderer.once('profile-loaded', (event, profileData) => callback(profileData));
  },


  // ▼▼▼ この関数を追加 ▼▼▼
  /**
   * メインプロセスにレポート生成を要求し、結果（レポートテキスト）を受け取る
   * @returns {Promise<string>} 生成されたレポートのテキスト
   */
  generateReport: () => ipcRenderer.invoke('generate-report'),
  // ▲▲▲ ここまで ▲▲▲

});