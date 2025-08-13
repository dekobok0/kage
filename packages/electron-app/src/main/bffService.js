// src/main/bffService.js
// BFFサーバーとの通信(axios)に特化したサービス

const axios = require('axios');
const log = require('electron-log');

class BFFService {
  constructor(baseURL = 'http://localhost:8080') {
    // BFFサーバーのベースURL
    this.baseURL = baseURL;
    
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
    log.info('[BFF] Sending audio data for transcription');
    
    const response = await this.client.post('/api/transcribe', {
      audioContent: audioData,
      timestamp: new Date().toISOString(),
      format: 'base64'
    });

    log.info('[BFF] Transcription completed successfully');
    return response.data;
  }

  /**
   * BFFサーバーのヘルスチェック
   * @returns {Promise<boolean>} サーバーが利用可能かどうか
   */
  async healthCheck() {
    const response = await this.client.get('/health');
    log.info('[BFF] Health check passed');
    return true;
  }

  /**
   * プロフィールデータをBFFサーバーに送信
   * @param {Object} profileData - ユーザープロフィールデータ
   * @returns {Promise<Object>} 処理結果
   */
  async saveProfile(profileData) {
    log.info('[BFF] Sending profile data to BFF server');
    
    const response = await this.client.post('/api/profile', {
      profile: profileData,
      timestamp: new Date().toISOString()
    });

    log.info('[BFF] Profile saved successfully');
    return response.data;
  }

  /**
   * 会話ログをBFFサーバーに送信
   * @param {Array} conversationLog - 会話ログデータ
   * @returns {Promise<Object>} 処理結果
   */
  async saveConversationLog(conversationLog) {
    log.info('[BFF] Sending conversation log to BFF server');
    
    const response = await this.client.post('/api/conversation', {
      log: conversationLog,
      timestamp: new Date().toISOString()
    });

    log.info('[BFF] Conversation log saved successfully');
    return response.data;
  }

  /**
   * レポート生成のためのデータをBFFサーバーから取得
   * @param {Object} reportParams - レポート生成パラメータ
   * @returns {Promise<Object>} レポートデータ
   */
  async generateReport(reportParams) {
    log.info('[BFF] Requesting report generation from BFF server');
    
    const response = await this.client.post('/api/report', {
      params: reportParams,
      timestamp: new Date().toISOString()
    });

    log.info('[BFF] Report generated successfully');
    return response.data;
  }
}

module.exports = BFFService;
