// src/main/ipcHandlers.js
// IPCの"受付"役。BFFサービスを呼び出す

const { ipcMain } = require('electron');
const BFFService = require('./bffService');
const log = require('electron-log');

class IPCHandlers {
  constructor(baseURL = 'http://localhost:8080') {
    this.bffService = new BFFService(baseURL);
    this.initializeHandlers();
    log.info('[IPC] IPCHandlers initialized');
  }

  /**
   * 全てのIPCハンドラーを初期化
   */
  initializeHandlers() {
    // 音声文字起こしのハンドラー
    this.setupTranscribeHandler();
    
    // 会話ログ保存のハンドラー
    this.setupConversationHandler();
    
    // ヘルスチェックのハンドラー
    this.setupHealthCheckHandler();
  }

  /**
   * 音声文字起こしのIPCハンドラー
   */
  setupTranscribeHandler() {
    ipcMain.handle('transcribe-audio', async (event, audioData) => {
      log.info('[IPC] Audio transcription requested');
      
      try {
        const result = await this.bffService.transcribeAudio(audioData);
        log.info('[IPC] Transcription completed successfully');
        return { success: true, data: result };
      } catch (error) {
        log.error('[IPC] Transcription handler error:', error);
        return { 
          success: false, 
          error: {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          }
        };
      }
    });
  }



  /**
   * 会話ログ保存のIPCハンドラー
   */
  setupConversationHandler() {
    ipcMain.handle('save-conversation-bff', async (event, conversationLog) => {
      log.info('[IPC] Conversation log save requested via BFF');
      
      try {
        const result = await this.bffService.saveConversationLog(conversationLog);
        log.info('[IPC] Conversation log saved via BFF successfully');
        return { success: true, data: result };
      } catch (error) {
        log.error('[IPC] Conversation handler error:', error);
        return { 
          success: false, 
          error: {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          }
        };
      }
    });
  }



  /**
   * ヘルスチェックのIPCハンドラー
   */
  setupHealthCheckHandler() {
    ipcMain.handle('bff-health-check', async (event) => {
      log.info('[IPC] BFF health check requested');
      
      try {
        const isHealthy = await this.bffService.healthCheck();
        log.info('[IPC] BFF server is healthy');
        return { success: true };
      } catch (error) {
        log.error('[IPC] Health check handler error:', error);
        return { 
          success: false, 
          error: {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          }
        };
      }
    });
  }

  /**
   * BFFサービスのインスタンスを取得（テスト用）
   */
  getBFFService() {
    return this.bffService;
  }
}

module.exports = IPCHandlers;
