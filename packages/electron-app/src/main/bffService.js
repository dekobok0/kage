// src/main/bffService.js
// BFFサーバーとの通信(axios)に特化したサービス

const axios = require('axios');
const log = require('electron-log');

class BFFService {
  constructor() {
    // BFFサーバーのベースURL
    this.baseURL = 'http://localhost:8080';
    
    // axiosインスタンスの設定
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30秒
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => {
        log.info(`[BFF] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        log.error(`[BFF] Request failed: ${error.message}`);
        if (error.response) {
          log.error(`[BFF] Status: ${error.response.status}, Data:`, error.response.data);
        }
        return Promise.reject(error);
      }
    );

    log.info('[BFF] BFFService initialized');
  }

  /**
   * 音声データをBFFサーバーに送信して文字起こしを実行
   * @param {string} audioData - Base64エンコードされた音声データ
   * @returns {Promise<Object>} 文字起こし結果
   */
  async transcribeAudio(audioData) {
    try {
      log.info('[BFF] Sending audio data for transcription');
      
      const response = await this.client.post('/api/transcribe', {
        audioContent: audioData,
        timestamp: new Date().toISOString(),
        format: 'base64'
      });

      log.info('[BFF] Transcription completed successfully');
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      log.error('[BFF] Transcription failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * BFFサーバーのヘルスチェック
   * @returns {Promise<boolean>} サーバーが利用可能かどうか
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      log.info('[BFF] Health check passed');
      return true;
    } catch (error) {
      log.warn('[BFF] Health check failed:', error.message);
      return false;
    }
  }

  /**
   * プロフィールデータをBFFサーバーに送信
   * @param {Object} profileData - ユーザープロフィールデータ
   * @returns {Promise<Object>} 処理結果
   */
  async saveProfile(profileData) {
    try {
      log.info('[BFF] Sending profile data to BFF server');
      
      const response = await this.client.post('/api/profile', {
        profile: profileData,
        timestamp: new Date().toISOString()
      });

      log.info('[BFF] Profile saved successfully');
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      log.error('[BFF] Profile save failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 会話ログをBFFサーバーに送信
   * @param {Array} conversationLog - 会話ログデータ
   * @returns {Promise<Object>} 処理結果
   */
  async saveConversationLog(conversationLog) {
    try {
      log.info('[BFF] Sending conversation log to BFF server');
      
      const response = await this.client.post('/api/conversation', {
        log: conversationLog,
        timestamp: new Date().toISOString()
      });

      log.info('[BFF] Conversation log saved successfully');
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      log.error('[BFF] Conversation log save failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * レポート生成のためのデータをBFFサーバーから取得
   * @param {Object} reportParams - レポート生成パラメータ
   * @returns {Promise<Object>} レポートデータ
   */
  async generateReport(reportParams) {
    try {
      log.info('[BFF] Requesting report generation from BFF server');
      
      const response = await this.client.post('/api/report', {
        params: reportParams,
        timestamp: new Date().toISOString()
      });

      log.info('[BFF] Report generated successfully');
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      log.error('[BFF] Report generation failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = BFFService;
