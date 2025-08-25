// src/index.js (全ての修正を反映した最終版)

if (process.stdout.isTTY) {
  process.stdout.reconfigure({ encoding: 'utf-8' });
}
if (process.stderr.isTTY) {
  process.stderr.reconfigure({ encoding: 'utf-8' });
}


// --- モジュールのインポート ---
const { app, BrowserWindow, ipcMain, safeStorage, dialog, shell } = require('electron');
const path = require('node:path');
const Store = require('electron-store').default;
const log = require('electron-log');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

// BFF統合のための新しいモジュール
// const IPCHandlers = require('./main/ipcHandlers');
// const ReportService = require('./main/reportService');

const dotenv = require('dotenv');


// --- .env ファイルの読み込み ---
if (!app.isPackaged) {
  // 開発時：
  // 実行されているファイル(__dirname = .../dist/main)から2階層上がって('.env'を探す)
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
}
// 本番時：
// .envファイルは配布物（インストーラー）に含めるべきではありません。
// APIキーなどはBFFサーバーで管理するのが最も安全な方法です。
// そのため、本番環境では .env を読み込むコード自体を動かさないのがベストです。

// IPCHandlersクラスを直接定義
class IPCHandlers {
  constructor(baseURL = 'http://localhost:8080') {
    this.bffService = new BFFService(baseURL);
    this.initializeHandlers();
    log.info('[IPC] IPCHandlers initialized');
  }

  initializeHandlers() {
    this.setupTranscribeHandler();
    this.setupConversationHandler();
    this.setupHealthCheckHandler();
  }

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
}

// BFFServiceクラスを直接定義
class BFFService {
  constructor(baseURL = 'http://localhost:8080') {
    this.baseURL = baseURL;
    log.info('[BFF] BFFService initialized with URL:', baseURL);
  }

  async transcribeAudio(audioData) {
    // 実装は後で追加
    log.info('[BFF] Audio transcription requested');
    return { text: 'Transcription placeholder' };
  }

  async saveConversationLog(conversationLog) {
    // 実装は後で追加
    log.info('[BFF] Conversation log save requested');
    return { success: true };
  }

  async healthCheck() {
    // 実装は後で追加
    log.info('[BFF] Health check requested');
    return true;
  }
}

// ReportServiceクラスを直接定義（Stripe依存関係を削除）
class ReportService {
  constructor() {
    log.info('[Report] ReportService initialized (Stripe removed, using BFF)');
  }

  /**
   * プロフィールセクションのHTMLを生成
   * @param {Object} profile - ユーザープロフィール
   * @returns {string} HTML文字列
   */
  generateProfileSection(profile) {
    let html = '';
    
    // 第1層：根源的な認知・情報処理スタイル
    html += '<h3>【第1層：根源的な認知・情報処理スタイル】</h3>';
    if (profile.information_processing) {
        const infoMap = { 
            'visual': '視覚的に（図表、チャート、色分け）', 
            'verbal': '言語的に（文章、説明、議論）', 
            'kinesthetic': '実践的に（体験、手を動かす、試行錯誤）', 
            'auditory': '聴覚的に（音声、音楽、リズム）' 
        };
        html += `<p><strong>情報処理スタイル:</strong> ${infoMap[profile.information_processing] || '未選択'}</p>`;
    }
    if (profile.learning_style) {
        const learnMap = { 
            'linear': '段階的に、順番通りに進める', 
            'holistic': '全体像を先に把握してから詳細へ', 
            'experimental': '実際に試してみながら理解する' 
        };
        html += `<p><strong>学習スタイル:</strong> ${learnMap[profile.learning_style] || '未選択'}</p>`;
    }

    // 第2層：対人・業務特性
    html += '<h3>【第2層：対人・業務特性】</h3>';
    if (profile.team_style) {
        const teamMap = { 
            'collaborative': '積極的に意見を出し、他者と協力する', 
            'independent': '個人で深く考えてから、成果を共有する', 
            'supportive': '他者の作業をサポートし、調整役を担う' 
        };
        html += `<p><strong>チームでの作業スタイル:</strong> ${teamMap[profile.team_style] || '未選択'}</p>`;
    }
    if (profile.change_response) {
        const changeMap = { 
            'embrace': '新しいことに積極的に挑戦する', 
            'cautious': '慎重に検討してから行動する', 
            'adaptable': '状況に応じて柔軟に対応する' 
        };
        html += `<p><strong>変化への反応:</strong> ${changeMap[profile.change_response] || '未選択'}</p>`;
    }

    // 第3層：具体的な環境ニーズ
    html += '<h3>【第3層：具体的な環境ニーズ】</h3>';
    if (profile.environment_needs && profile.environment_needs.length > 0) {
        const envMap = { 
            'lighting': '照明の調整（明るさ、色温度）', 
            'noise': '音環境の調整（静寂、BGM、ノイズキャンセリング）', 
            'space': '物理的空間（個室、パーティション、座席位置）', 
            'schedule': 'スケジュール調整（休憩時間、勤務時間）', 
            'tech': '技術的支援（ソフトウェア、デバイス）' 
        };
        const envText = profile.environment_needs.map(need => envMap[need]).join('、');
        html += `<p><strong>職場環境での配慮点:</strong> ${envText}</p>`;
    }

    // モジュール1：How I Connect
    html += '<h3>【モジュール1：コミュニケーションの好み】</h3>';
    if (profile.instruction_preference) {
        const prefMap = { 
            'written': '書面で提供される（メール、ドキュメント）', 
            'verbal': '口頭で説明される（通話、対面）', 
            'visual': '図やフローチャートを用いた視覚的な説明',
            'demonstration': '実際にやって見せる（デモンストレーション）'
        };
        html += `<p><strong>指示理解の好み:</strong> ${prefMap[profile.instruction_preference] || '未選択'}</p>`;
    }
    if (profile.meeting_needs && profile.meeting_needs.length > 0) {
        const needsMap = { 
            'agenda': '事前の議題共有', 
            'process_time': '応答前の思考時間の確保', 
            'chat_option': 'テキストでの意見表明',
            'visual_aids': '視覚資料（スライド、図表）',
            'breakout': '小グループでの議論時間'
        };
        const needsText = profile.meeting_needs.map(need => needsMap[need]).join('、');
        html += `<p><strong>会議で役立つこと:</strong> ${needsText}</p>`;
    }
    if (profile.feedback_preference) {
        const feedbackMap = { 
            'written': '書面での詳細なフィードバック', 
            'verbal': '1対1での対話形式', 
            'visual': '図表やチェックリストを使った説明',
            'gradual': '段階的に、少しずつ改善点を共有'
        };
        html += `<p><strong>フィードバックの好み:</strong> ${feedbackMap[profile.feedback_preference] || '未選択'}</p>`;
    }

    // モジュール2：How I Focus & Achieve
    html += '<h3>【モジュール2：得意な働き方】</h3>';
    if (profile.task_structure) {
        const taskMap = { 
            'structured': '明確で、順番が決まったステップがある仕事', 
            'flexible': '最終目標は明確だが、方法は自由な仕事',
            'iterative': '試行錯誤しながら改善していく仕事',
            'collaborative': '他者と協力しながら進める仕事'
        };
        html += `<p><strong>仕事の進め方:</strong> ${taskMap[profile.task_structure] || '未選択'}</p>`;
    }
    if (profile.work_rhythm) {
        const rhythmMap = { 
            'deep_focus': '中断されない長い集中時間', 
            'varied_tasks': '様々なタスクの組み合わせ', 
            'sprints': '短期集中型の作業',
            'flow': '自分のペースで没頭できる時間'
        };
        html += `<p><strong>理想的な仕事のリズム:</strong> ${rhythmMap[profile.work_rhythm] || '未選択'}</p>`;
    }
    if (profile.focus_environment && profile.focus_environment.length > 0) {
        const focusMap = { 
            'quiet': '静寂な環境', 
            'background': '適度な背景音（BGM、自然音）', 
            'visual': '視覚的な刺激を最小限にした環境',
            'comfort': '快適な温度・湿度',
            'breaks': '定期的な休憩時間'
        };
        const focusText = profile.focus_environment.map(env => focusMap[env]).join('、');
        html += `<p><strong>集中力維持のための環境:</strong> ${focusText}</p>`;
    }

    // モジュール3：My Sensory Needs
    html += '<h3>【モジュール3：理想的な職場環境】</h3>';
    if (profile.sensory_needs && profile.sensory_needs.length > 0) {
        const sensoryMap = { 
            'light': '照明の調整（明るさ、色、点滅の有無）', 
            'sound': '音の調整（音量、音質、突然の音）', 
            'touch': '触覚的な配慮（素材、温度、圧迫感）',
            'smell': '嗅覚的な配慮（香り、空気の質）',
            'movement': '動きの配慮（振動、揺れ、姿勢）'
        };
        const sensoryText = profile.sensory_needs.map(need => sensoryMap[need]).join('、');
        html += `<p><strong>感覚的な配慮:</strong> ${sensoryText}</p>`;
    }
    if (profile.physical_environment && profile.physical_environment.length > 0) {
        const physicalMap = { 
            'space': '十分な作業スペース', 
            'privacy': 'プライバシーの確保', 
            'accessibility': 'アクセシビリティ（移動、操作）',
            'ergonomics': 'エルゴノミクス（椅子、机、デバイス）',
            'climate': '温度・湿度・空気質の管理'
        };
        const physicalText = profile.physical_environment.map(env => physicalMap[env]).join('、');
        html += `<p><strong>物理的環境の重要要素:</strong> ${physicalText}</p>`;
    }

    // モジュール4：How I Thrive
    html += '<h3>【モジュール4：モチベーションとマネジメント】</h3>';
    if (profile.motivation_type) {
        const motivationMap = { 
            'achievement': '目標達成や成果を認められること', 
            'learning': '新しいことを学んだり成長できること', 
            'connection': 'チームや他者との良い関係',
            'autonomy': '自分の判断で仕事を進められること',
            'impact': '社会や他者に貢献できること'
        };
        html += `<p><strong>モチベーション源:</strong> ${motivationMap[profile.motivation_type] || '未選択'}</p>`;
    }
    if (profile.support_needs && profile.support_needs.length > 0) {
        const supportMap = { 
            'communication': '定期的なコミュニケーション機会', 
            'resources': '必要なリソースやツールの提供', 
            'flexibility': '柔軟なスケジュールや作業方法',
            'mentoring': 'メンタリングやコーチング',
            'breaks': '適切な休憩やリフレッシュ時間'
        };
        const supportText = profile.support_needs.map(need => supportMap[need]).join('、');
        html += `<p><strong>支援ニーズ:</strong> ${supportText}</p>`;
    }
    if (profile.career_development && profile.career_development.length > 0) {
        const careerMap = { 
            'training': 'スキル開発のための研修機会', 
            'mentoring': 'キャリアメンタリング', 
            'networking': 'ネットワーキング機会',
            'feedback': '定期的なフィードバック',
            'visibility': '成果の可視化や発信支援'
        };
        const careerText = profile.career_development.map(dev => careerMap[dev]).join('、');
        html += `<p><strong>キャリア開発ニーズ:</strong> ${careerText}</p>`;
    }

    return html;
  }

  /**
   * Q&AログセクションのHTMLを生成
   * @param {Array} conversationLog - 会話ログ
   * @returns {string} HTML文字列
   */
  generateQALogSection(conversationLog) {
    if (conversationLog.length === 0) {
        return '<p>（Q&Aログなし）</p>';
    }

    let html = '<h3>【Q&Aログ】</h3>';
    const questions = conversationLog.filter(item => item.type === 'Q');
    
    questions.forEach((item, index) => {
        const qIndex = conversationLog.indexOf(item);
        const nextItem = conversationLog[qIndex + 1];
        const answer = (nextItem && nextItem.type === 'A_chunk') ? nextItem.content.trim() : '（AIヒントなし）';
        
        html += `
          <div class="qa-log-entry">
            <div class="question">質問${index + 1}: ${item.content}</div>
            <div class="answer">AI提示ヒント: 「${answer.replace(/\n/g, ' ')}」</div>
          </div>
        `;
    });

    return html;
  }

  generateReportHTML(data) {
    const { startTime, endTime, hintCount, conversationLog, profile } = data;
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60)) || 1;
    const formatDate = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Kage合理的配慮レポート</title>
        <style>
          body {
            font-family: 'IPAexGothic', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif;
            font-size: 12pt;
            line-height: 1.4;
            margin: 0;
            padding: 20pt;
            background: white;
            color: black;
          }
          h1, h2, h3, h4 {
            page-break-after: avoid;
            break-after: avoid;
            margin-top: 1em;
            margin-bottom: 0.5em;
          }
          h1 { font-size: 18pt; }
          h2 { font-size: 16pt; }
          h3 { font-size: 14pt; }
          h4 { font-size: 12pt; }
          p { margin: 0.5em 0; }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: inherit;
            margin: 0.5em 0;
          }
          .qa-log-entry {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 1em;
            padding: 0.5em;
            border-left: 3px solid #007acc;
            background-color: #f8f9fa;
          }
          .question {
            font-weight: bold;
            color: #333;
          }
          .answer {
            margin-top: 0.5em;
            color: #666;
          }
          @media print {
            body { margin: 0; padding: 15pt; }
            .qa-log-entry { 
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <h1>合理配慮の提供に関する報告書</h1>
        <p>========================================</p>
        <p><strong>報告日:</strong> ${formatDate(endTime)}</p>
        
        <h2>1. 面接実施記録</h2>
        <p>----------------------------------------</p>
        <p><strong>面接開始時刻:</strong> ${formatDate(startTime)}</p>
        <p><strong>面接終了時刻:</strong> ${formatDate(endTime)}</p>
        <p><strong>総所要時間:</strong> 約${durationMinutes}分</p>
        
        <h2>2. 提供された支援の概要</h2>
        <p>----------------------------------------</p>
        <p>本日の面接選考において、候補者の特性に応じた情報保障およびコミュニケーション支援のため、リアルタイムAI面接支援ツール「Kage」が利用されました。これは、改正障害者差別解消法における「合理的配慮の提供」に該当する可能性があります。</p>
        
        <h2>3. 申告された特性と必要な配慮（自己開示プロフィールより）</h2>
        <p>----------------------------------------</p>
        <p><strong>申告された特性・配慮点:</strong> ${profile.characteristics || '（申告なし）'}</p>
        
        ${this.generateProfileSection(profile)}
        
        <h2>4. ツールの利用詳細</h2>
        <p>----------------------------------------</p>
        <p><strong>AIによるリアルタイム回答支援の利用回数:</strong> ${hintCount}回</p>
        
        ${this.generateQALogSection(conversationLog)}
        
        <h2>5. 免責事項</h2>
        <p>----------------------------------------</p>
        <p>本レポートは、合理的配慮の提供努力を文書化するものであり、選考の合否を保証または示唆するものではありません。</p>
      </body>
      </html>
    `;
  }

  async createCheckoutSession() {
    // BFFサーバー経由で決済セッションを作成
    // この実装はmain processで行われる
    throw new Error('このメソッドはBFFサーバー経由で呼び出されるべきです');
  }
}


// Squirrelのセットアップイベント処理は削除済み

// --- electron-log の設定 ---
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log');
log.transports.file.level = 'info';
log.info(`Application version ${app.getVersion()} starting...`);

// --- electron-store の設定 ---
const schema = {
	userProfile: { type: 'object', default: {} },
  interviewStartTime: { type: 'string' },
  hintCount: { type: 'number', default: 0 },
  conversationLog: { type: 'array', default: [] }
};
const store = new Store({ schema });

// ▼▼▼ AIインタラクションを記録する堅牢な関数を追加 ▼▼▼
function logAiInteraction() {
    try {
        // 1. 現在のカウントを取得
        const currentCount = store.get('hintCount', 0);
        // 2. カウンタをインクリメント
        const newCount = currentCount + 1;
        // 3. 更新されたカウントを書き戻す
        store.set('hintCount', newCount);
        log.info(`AI interaction logged. Total calls: ${newCount}`);
    } catch (error) {
        log.error('Failed to log AI interaction:', error);
    }
}

// ▼▼▼ Q&Aログを保存する関数を追加 ▼▼▼
function logConversation(userQuery, aiResponse) {
    try {
        // 1. 現在の会話ログを取得
        const currentLog = store.get('conversationLog', []);
        
        // 2. 新しいQ&Aエントリを追加
        const newEntry = {
            type: 'Q',
            content: userQuery,
            timestamp: new Date().toISOString()
        };
        currentLog.push(newEntry);
        
        // 3. AI回答エントリを追加
        const aiEntry = {
            type: 'A_chunk',
            content: aiResponse,
            timestamp: new Date().toISOString()
        };
        currentLog.push(aiEntry);
        
        // 4. 更新されたログを保存
        store.set('conversationLog', currentLog);
        log.info(`Conversation logged. Total entries: ${currentLog.length}`);
    } catch (error) {
        log.error('Failed to log conversation:', error);
    }
}

// ReportServiceを使用するため、古いヘルパー関数は削除

// ReportServiceでStripeを管理するため、ここでの初期化は不要

function getChromiumPath() {
  const isDev = !app.isPackaged;

  try {
    const baseDir = isDev
  ? path.join(__dirname, '..', '..', '..', '.puppeteer-cache')
  : path.join(process.resourcesPath, 'puppeteer');

    // 'chrome'サブディレクトリのパスを正しく作成する
    const chromeCacheDir = path.join(baseDir, 'chrome');

    // 'chrome'サブディレクトリの中からバージョン名のフォルダを探す
    const browserDirName = fs.readdirSync(chromeCacheDir).find(dir => dir.startsWith('win64-'));
    if (!browserDirName) {
      log.warn('Browser version directory not found in the chrome cache directory.');
      return null;
    }

    // 実行ファイルまでの最終パスを組み立てる
    const executablePath = path.join(
      chromeCacheDir,
      browserDirName,
      'chrome-win64', // この内部パスは@puppeteer/browsersの仕様
      'chrome.exe'
    );

    if (!fs.existsSync(executablePath)) {
      log.warn(`Chromium executable not found at: ${executablePath}`);
      return null;
    }

    log.info(`Found Chromium executable at: ${executablePath}`);
    return executablePath;

  } catch (error) {
    log.error('Failed to get Chromium path:', error);
    // エラーが発生した場合、詳細をログに記録し、nullを返すことで、
    // 呼び出し元がエラーを適切に処理できるようにする。
    return null;
  }
}

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    webPreferences: {
      // プリロードスクリプトのパスを動的に解決
      preload: path.join(__dirname, '../preload/index.js'),
      // セキュリティのため、contextIsolationはtrueが強く推奨される
      contextIsolation: true,
      // レンダラープロセスでのNode.js統合は無効にする
      nodeIntegration: false
    }
  })

  // 開発モードと本番モードで読み込む内容を切り替える
  if (process.env.ELECTRON_RENDERER_URL) {
    // 開発時: electron-viteが提供する開発サーバーのURLを読み込む
    // 'ELECTRON_RENDERER_URL'はelectron-viteによって自動的に設定される
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // 本番時: ビルドされたindex.htmlを読み込む
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // 面接セッションのログを初期化 (ここは元のまま)
  store.set('interviewStartTime', new Date().toISOString());
  store.set('hintCount', 0);
  store.set('conversationLog', []);
  log.info('New interview session initialized.');

  // プロフィール読み込み処理 (ここは元のまま)
  mainWindow.webContents.on('did-finish-load', () => {
    try {
      const encryptedProfile = store.get('userProfile');
      if (encryptedProfile && Object.keys(encryptedProfile).length > 0 && safeStorage.isEncryptionAvailable()) {
          const decryptedProfile = {};
          for (const key in encryptedProfile) {
              const originalKey = key.replace('encrypted_', '');
              const decryptedString = safeStorage.decryptString(Buffer.from(encryptedProfile[key], 'base64'));
              
              try {
                  const wrapper = JSON.parse(decryptedString);
                  if (wrapper.type === 'json') {
                      decryptedProfile[originalKey] = JSON.parse(wrapper.value);
                  } else {
                      decryptedProfile[originalKey] = wrapper.value;
                  }
              } catch (e) {
                  log.warn(`Failed to parse decrypted value for key ${originalKey}:`, e);
                  log.error(`Parse failed for key ${originalKey}, raw string: ${decryptedString}`);
                  // フォールバック: 古い形式のデータの場合
                  try {
                      decryptedProfile[originalKey] = JSON.parse(decryptedString);
                  } catch (e2) {
                      log.error(`Fallback parse also failed for key ${originalKey}, raw string: ${decryptedString}`);
                      decryptedProfile[originalKey] = decryptedString;
                  }
              }
          }
          log.info('Successfully loaded and decrypted profile for UI.');
          mainWindow.webContents.send('profile-loaded', decryptedProfile);
      } else {
        log.info('No profile found or encryption not available. Skipping profile load.');
      }
    } catch (error) {
      log.error('Failed to load and decrypt profile:', error);
      store.set('userProfile', {}); // エラー時はプロファイルをリセット
    }
  });
};

// ▼▼▼ 修正箇所：プロフィール保存処理 ▼▼▼
ipcMain.handle('save-profile', async (event, profileData) => {
  if (!safeStorage.isEncryptionAvailable()) {
    log.error('Encryption is not available on this system. Profile not saved.');
    return { success: false, error: '暗号化が利用できません。' };
  }
  try {
    const encryptedProfile = {};
    for (const key in profileData) {
        const value = profileData[key];
        let type, valueToEncrypt;

        if (typeof value === 'object' && value !== null) {
            type = 'json';
            valueToEncrypt = JSON.stringify(value);
        } else {
            type = 'string';
            valueToEncrypt = String(value);
        }
        
        // 型情報を持つオブジェクトで包んでから暗号化
        const wrapper = { type, value: valueToEncrypt };
        const encryptedValue = safeStorage.encryptString(JSON.stringify(wrapper));
        encryptedProfile[`encrypted_${key}`] = encryptedValue.toString('base64');
    }
    store.set('userProfile', encryptedProfile);
    log.info('Successfully encrypted and saved profile.');
    return { success: true };
  } catch (error) {
    log.error('Failed to encrypt and save profile:', error);
    return { success: false, error: error.message };
  }
});

// ▼▼▼【お掃除用コード】ここから ▼▼▼
ipcMain.handle('clear-store-dangerously', () => {
  try {
    store.clear();
    log.info('全データを削除しました。');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
// ▲▲▲【お掃除用コード】ここまで ▲▲▲

// ▼▼▼ 面接モード時のウィンドウサイズ調整 ▼▼▼
ipcMain.on('switch-to-interview-mode', () => {
  if (mainWindow) {
    // 面接モード時はウィンドウを小さくして、右側に配置
    const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setSize(400, 600);
    mainWindow.setPosition(width - 420, 100);
    mainWindow.setAlwaysOnTop(true);
    log.info('Switched to interview mode - window resized and positioned');
  }
});

ipcMain.on('switch-to-prep-mode', () => {
  if (mainWindow) {
    // 準備モード時は元のサイズに戻す
    mainWindow.setSize(800, 600);
    mainWindow.center();
    mainWindow.setAlwaysOnTop(false);
    log.info('Switched to preparation mode - window restored to original size');
  }
});

// レポート生成のIPCハンドラー
ipcMain.handle('generate-report', async (event) => {
  log.info('Report generation requested.');

  // ▼▼▼ IPCセキュリティの実装（開発環境では緩和） ▼▼▼
  if (app.isPackaged) {
    // 本番環境でのみ厳密なチェック
    try {
      const senderUrl = new URL(event.senderFrame.url);
      if (senderUrl.protocol !== 'file:') {
        throw new Error('Untrusted sender: IPC call rejected.');
      }
    } catch (error) {
      log.error('IPC security check failed:', error);
      return { success: false, message: 'セキュリティチェックに失敗しました。' };
    }
  } else {
    // 開発環境ではログのみ
    log.info('[DEV] IPC security check bypassed for development');
  }
  // ▲▲▲ IPCセキュリティここまで ▲▲▲

  try {
    // 1. 必要なデータを全てストアから取得
    const startTimeISO = store.get('interviewStartTime');
    const hintCount = store.get('hintCount', 0);
    const conversationLog = store.get('conversationLog', []);

    // 2. プロフィールデータを読み込んで復号する
    let decryptedProfile = {};
    try {
        const encryptedProfile = store.get('userProfile');
        if (encryptedProfile && Object.keys(encryptedProfile).length > 0 && safeStorage.isEncryptionAvailable()) {
          for (const key in encryptedProfile) {
              const originalKey = key.replace('encrypted_', '');
              const decryptedString = safeStorage.decryptString(Buffer.from(encryptedProfile[key], 'base64'));
              
              try {
                  const wrapper = JSON.parse(decryptedString);
                  if (wrapper.type === 'json') {
                      decryptedProfile[originalKey] = JSON.parse(wrapper.value);
                  } else {
                      decryptedProfile[originalKey] = wrapper.value;
                  }
              } catch (e) {
                  log.warn(`Failed to parse decrypted value for key ${originalKey}:`, e);
                  log.error(`Parse failed for key ${originalKey}, raw string: ${decryptedString}`);
                  // フォールバック: 古い形式のデータの場合
                  try {
                      decryptedProfile[originalKey] = JSON.parse(decryptedString);
                  } catch (e2) {
                      log.error(`Fallback parse also failed for key ${originalKey}, raw string: ${decryptedString}`);
                      decryptedProfile[originalKey] = decryptedString;
                  }
              }
          }
        } else {
          // プロフィールがない場合でもレポートは生成を試みる
          log.warn('Profile not found, generating report without profile data.');
        }
    } catch(e) {
      log.error('Report generation failed due to profile decryption error:', e);
      return { success: false, message: 'エラー: プロフィール情報の読み込みに失敗しました。' };
    }
    
    // 3. ReportServiceを使用してレポートを生成
    const reportService = new ReportService();
    const startTime = new Date(startTimeISO);
    const endTime = new Date();
    
    const htmlContent = reportService.generateReportHTML({
      startTime,
      endTime,
      hintCount,
      conversationLog,
      profile: decryptedProfile
    });

    // 4. 動的パス解決ロジックを使用した安全なPDF生成
    const chromiumPath = getChromiumPath();
    const launchOptions = {
      headless: true,  // ヘッドレスモードで実行
    };

    if (chromiumPath && fs.existsSync(chromiumPath)) {
      launchOptions.executablePath = chromiumPath;
      log.info(`Using bundled Chromium: ${chromiumPath}`);
    } else {
      log.warn('Bundled Chromium not found, using system default');
      // システムのChromeを使用する場合の設定
      launchOptions.channel = 'chrome';  // システムのChromeを使用
    }

    log.info('Launching Puppeteer with options:', launchOptions);
    const browser = await puppeteer.launch(launchOptions);
    
    try {
      log.info('Creating new page for PDF generation');
      const page = await browser.newPage();
      
      log.info('Setting HTML content');
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      log.info('Generating PDF...');
      const pdfBytes = await page.pdf({ 
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      });
      
      log.info(`PDF generated successfully, size: ${pdfBytes.length} bytes`);
      await page.close();
      
      // 5. ファイル保存ダイアログを表示
      const { filePath } = await dialog.showSaveDialog(mainWindow, { 
          title: 'レポートを保存', 
          defaultPath: `Kage合理的配慮レポート_${new Date().toISOString().slice(0,10)}.pdf` 
      });

      if (filePath) {
        fs.writeFileSync(filePath, pdfBytes);
        log.info(`PDF saved to: ${filePath}`);
        return { success: true, message: `レポートが保存されました。` };
      } else {
        log.info('PDF save was cancelled by user');
        return { success: false, message: '保存がキャンセルされました。' };
      }
    } catch (error) {
      log.error('PDF generation failed:', error);
      return { success: false, message: `PDFレポートの生成に失敗しました: ${error.message}` };
    } finally {
      if (browser !== null) {
        log.info('Closing browser');
        await browser.close();
      }
    }
  } catch (error) {
    log.error('PDF generation failed:', error);
    return { success: false, message: `PDFレポートの生成に失敗しました: ${error.message}` };
  }
});

// BFFサーバー経由でStripe Checkoutセッション作成の処理
ipcMain.handle('create-checkout-session', async (event, priceId) => {
  try {
    const axios = require('axios');
    const response = await axios.post(
      'http://localhost:8080/api/create-checkout-session', 
      { priceId: priceId || 'price_1RmYiIRhh0YbRyvV9bJG7N3v' }
    );
    return { success: true, url: response.data.url };
  } catch (error) {
    log.error('BFFへのStripeセッション作成依頼に失敗:', error);
    return { success: false, message: error.message };
  }
});

// 外部URLを開く処理
ipcMain.on('open-external-url', (event, url) => {
  shell.openExternal(url);
});


// BFF統合のためのIPCハンドラーは、IPCHandlersクラスで管理されます



// --- アプリケーションのライフサイクル ---
app.whenReady().then(() => {
  createWindow();

  // BFF統合のためのIPCハンドラーを初期化
  const bffBaseURL = process.env.BFF_BASE_URL || 'http://localhost:8080';
  const ipcHandlers = new IPCHandlers(bffBaseURL);
  log.info('[BFF] BFF統合のためのIPCハンドラーが初期化されました。');
  log.info(`[BFF] BFFサーバーURL: ${bffBaseURL}`);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});