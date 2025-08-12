// src/preload.js

const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('api', {
  onPythonData: (callback) => {
    ipcRenderer.on('from-python', (event, data) => callback(data));
  },
  
  // ★★★ BFFサーバーとの通信用API ★★★
  /**
   * 音声データをBFFサーバーに送信して文字起こしを要求する
   * @param {string} audioData - 音声データ
   * @returns {Promise<object>} 文字起こし結果
   */
  transcribeAudio: (audioData) => ipcRenderer.invoke('transcribe-audio', audioData),
  
  /**
   * プロフィールデータをBFFサーバーに送信して保存を要求する
   * @param {object} profileData - プロフィールデータ
   * @returns {Promise<object>} 保存結果
   */
  saveProfileBff: (profileData) => ipcRenderer.invoke('save-profile-bff', profileData),
  
  /**
   * 会話ログをBFFサーバーに送信して保存を要求する
   * @param {array} conversationLog - 会話ログデータ
   * @returns {Promise<object>} 保存結果
   */
  saveConversationLogBff: (conversationLog) => ipcRenderer.invoke('save-conversation-bff', conversationLog),
  
  /**
   * BFFサーバーからレポート生成を要求する
   * @param {object} reportParams - レポート生成パラメータ
   * @returns {Promise<object>} レポート生成結果
   */
  generateReportBff: (reportParams) => ipcRenderer.invoke('generate-report-bff', reportParams),
  
  /**
   * BFFサーバーのヘルスチェックを実行する
   * @returns {Promise<object>} ヘルスチェック結果
   */
  bffHealthCheck: () => ipcRenderer.invoke('bff-health-check'),
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

  // ▼▼▼ モード切り替え用のAPI関数を追加 ▼▼▼
  /**
   * 面接モードに切り替える
   */
  switchToInterviewMode: () => {
    ipcRenderer.send('switch-to-interview-mode');
  },
  
  /**
   * 準備モードに切り替える
   */
  switchToPrepMode: () => {
    ipcRenderer.send('switch-to-prep-mode');
  },
  // ▲▲▲ ここまで ▲▲▲

  // ▼▼▼ この関数を追加 ▼▼▼
  /**
   * メインプロセスにレポート生成を要求し、結果（レポートテキスト）を受け取る
   * @returns {Promise<string>} 生成されたレポートのテキスト
   */
  generateReport: () => ipcRenderer.invoke('generate-report'),
  // ▲▲▲ ここまで ▲▲▲

  // ▼▼▼ この2つの関数を追加 ▼▼▼
  createCheckoutSession: () => ipcRenderer.invoke('create-checkout-session'),
  openExternalUrl: (url) => ipcRenderer.send('open-external-url', url),
  // ▲▲▲ ここまで ▲▲▲

});