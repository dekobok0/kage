// src/preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 音声文字起こし
  transcribeAudio: (audioData) => ipcRenderer.invoke('transcribe-audio', audioData),
  
  // プロフィール管理
  saveProfile: (profileData) => ipcRenderer.invoke('save-profile', profileData),
  
  onProfileLoaded: (callback) => {
    ipcRenderer.once('profile-loaded', (event, profileData) => callback(profileData));
  },

  // モード切り替え
  switchToInterviewMode: () => {
    ipcRenderer.send('switch-to-interview-mode');
  },
  
  switchToPrepMode: () => {
    ipcRenderer.send('switch-to-prep-mode');
  },

  // レポート生成
  generateReport: () => ipcRenderer.invoke('generate-report'),
  
  // 決済関連
  createCheckoutSession: (priceId) => ipcRenderer.invoke('create-checkout-session', priceId),
  openExternalUrl: (url) => ipcRenderer.send('open-external-url', url),
  
  // ▼▼▼【お掃除用API】この一行を追加 ▼▼▼
  clearStore: () => ipcRenderer.invoke('clear-store-dangerously'),
  // ▲▲▲【お掃除用API】ここまで ▲▲▲
});