// src/main/ipcHandlers.js
// IPCの"受付"役。BFFサービスを呼び出す

const { ipcMain } = require('electron');
const BFFService = require('./bffService');
const log = require('electron-log');

class IPCHandlers {
  constructor() {
    this.bffService = new BFFService();
    this.initializeHandlers();
    log.info('[IPC] IPCHandlers initialized');
  }

  /**
   * 全てのIPCハンドラーを初期化
   */
  initializeHandlers() {
    // 音声文字起こしのハンドラー
    this.setupTranscribeHandler();
    
    // プロフィール保存のハンドラー
    this.setupProfileHandler();
    
    // 会話ログ保存のハンドラー
    this.setupConversationHandler();
    
    // レポート生成のハンドラー
    this.setupReportHandler();
    
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
        
        if (result.success) {
          log.info('[IPC] Transcription completed successfully');
        } else {
          log.warn('[IPC] Transcription failed:', result.error);
        }
        
        return result;
      } catch (error) {
        log.error('[IPC] Transcription handler error:', error);
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  /**
   * プロフィール保存のIPCハンドラー
   */
  setupProfileHandler() {
    ipcMain.handle('save-profile-bff', async (event, profileData) => {
      log.info('[IPC] Profile save requested via BFF');
      
      try {
        const result = await this.bffService.saveProfile(profileData);
        
        if (result.success) {
          log.info('[IPC] Profile saved via BFF successfully');
        } else {
          log.warn('[IPC] Profile save via BFF failed:', result.error);
        }
        
        return result;
      } catch (error) {
        log.error('[IPC] Profile handler error:', error);
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
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
        
        if (result.success) {
          log.info('[IPC] Conversation log saved via BFF successfully');
        } else {
          log.warn('[IPC] Conversation log save via BFF failed:', result.error);
        }
        
        return result;
      } catch (error) {
        log.error('[IPC] Conversation handler error:', error);
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  /**
   * レポート生成のIPCハンドラー
   */
  setupReportHandler() {
    ipcMain.handle('generate-report-bff', async (event, reportParams) => {
      log.info('[IPC] Report generation requested via BFF');
      
      try {
        const result = await this.bffService.generateReport(reportParams);
        
        if (result.success) {
          log.info('[IPC] Report generated via BFF successfully');
        } else {
          log.warn('[IPC] Report generation via BFF failed:', result.error);
        }
        
        return result;
      } catch (error) {
        log.error('[IPC] Report handler error:', error);
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
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
        
        if (isHealthy) {
          log.info('[IPC] BFF server is healthy');
        } else {
          log.warn('[IPC] BFF server health check failed');
        }
        
        return {
          success: isHealthy,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        log.error('[IPC] Health check handler error:', error);
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
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
