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
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const Stripe = require('stripe');

// BFF統合のための新しいモジュール
const IPCHandlers = require('./main/ipcHandlers');


// ▼▼▼ 修正点：Squirrelのセットアップイベントを早期に処理し、app.exit()を使用 ▼▼▼
// この処理は、appオブジェクトが定義された後でなければならない
if (require('electron-squirrel-startup')) {
  app.exit(); // quit()よりもexit()の方が即時終了するため安全
}




// --- .env ファイルの読み込み ---
const appRootPath = app.getAppPath();
const dotEnvPath = path.join(appRootPath, '.env');

log.info(`.envファイルの読み込みを試行します。パス: ${dotEnvPath}`);
if (fs.existsSync(dotEnvPath)) {
  log.info(`.env ファイルが指定されたパスに存在することを確認しました。`);
  require('dotenv').config({ path: dotEnvPath });
} else {
  log.error(` 致命的エラー:.env ファイルが指定されたパスに見つかりません: ${dotEnvPath}`);
}

if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
  log.info(`Stripe Secret Keyが正常にprocess.envにロードされました。`);
} else {
  log.error(` 致命的エラー: Stripe Secret Keyのprocess.envへのロードに失敗しました。`);
}

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

// ▼▼▼ HTML生成用のヘルパー関数を追加 ▼▼▼
function generateProfileSection(profile) {
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

function generateQALogSection(conversationLog) {
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
// ▲▲▲ ここまで追加 ▲▲▲

// --- Stripeの初期化 ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.openDevTools();

  // 面接セッションのログを初期化
  store.set('interviewStartTime', new Date().toISOString());
  store.set('hintCount', 0);
  store.set('conversationLog', []);
  log.info('New interview session initialized.');

  // ▼▼▼ 修正箇所：起動時のプロフィール読み込み処理 ▼▼▼
  mainWindow.webContents.on('did-finish-load', () => {
    try {
      const encryptedProfile = store.get('userProfile');
      if (encryptedProfile && Object.keys(encryptedProfile).length > 0 && safeStorage.isEncryptionAvailable()) {
          const decryptedProfile = {};
          for (const key in encryptedProfile) {
              const originalKey = key.replace('encrypted_', '');
              let decryptedValue = safeStorage.decryptString(Buffer.from(encryptedProfile[key], 'base64'));
              // JSON文字列だったもの（配列など）を元に戻す
              try {
                  decryptedValue = JSON.parse(decryptedValue);
              } catch (e) {
                  // Not a JSON string, do nothing
              }
              decryptedProfile[originalKey] = decryptedValue;
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
ipcMain.on('save-profile', (event, profileData) => {
  if (!safeStorage.isEncryptionAvailable()) {
    log.error('Encryption is not available on this system. Profile not saved.');
    return;
  }
  try {
    const encryptedProfile = {};
    for (const key in profileData) {
        // オブジェクトや配列はJSON文字列に変換してから暗号化
        const valueToEncrypt = typeof profileData[key] === 'object' ? JSON.stringify(profileData[key]) : profileData[key];
        if (valueToEncrypt) {
           const encryptedValue = safeStorage.encryptString(valueToEncrypt);
           encryptedProfile[`encrypted_${key}`] = encryptedValue.toString('base64');
        }
    }
    store.set('userProfile', encryptedProfile);
    log.info('Successfully encrypted and saved profile.');
  } catch (error) {
    log.error('Failed to encrypt and save profile:', error);
  }
});

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

// src/index.js の中のこの関数を丸ごと置き換える

ipcMain.handle('generate-report', async (event) => {
  log.info('Report generation requested.');

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
            let decryptedValue = safeStorage.decryptString(Buffer.from(encryptedProfile[key], 'base64'));
            try { decryptedValue = JSON.parse(decryptedValue); } catch (e) { /* Not JSON */ }
            decryptedProfile[originalKey] = decryptedValue;
        }
      } else {
        // プロフィールがない場合でもレポートは生成を試みる
        log.warn('Profile not found, generating report without profile data.');
      }
  } catch(e) {
    log.error('Report generation failed due to profile decryption error:', e);
    return { success: false, message: 'エラー: プロフィール情報の読み込みに失敗しました。' };
  }
  
  // 3. レポート内容を動的に生成する（以前の詳細情報と新しい情報を統合）
  const startTime = new Date(startTimeISO);
  const endTime = new Date();
  const durationMinutes = Math.round((endTime - startTime) / (1000 * 60)) || 1;
  const formatDate = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;


  // 4. PDFを生成して保存する
  try {
    // ▼▼▼ 印刷用スタイルを適用したHTMLを生成 ▼▼▼
    const htmlContent = `
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
        <p><strong>申告された特性・配慮点:</strong> ${decryptedProfile.characteristics || '（申告なし）'}</p>
        
        ${generateProfileSection(decryptedProfile)}
        
        <h2>4. ツールの利用詳細</h2>
        <p>----------------------------------------</p>
        <p><strong>AIによるリアルタイム回答支援の利用回数:</strong> ${hintCount}回</p>
        
        ${generateQALogSection(conversationLog)}
        
        <h2>5. 免責事項</h2>
        <p>----------------------------------------</p>
        <p>本レポートは、合理的配慮の提供努力を文書化するものであり、選考の合否を保証または示唆するものではありません。</p>
      </body>
      </html>
    `;
    // ▲▲▲ ここまで追加 ▲▲▲

    // ▼▼▼ 一時的なHTMLファイルを作成してPDF生成 ▼▼▼
    const tempHtmlPath = path.join(app.getPath('temp'), `kage-report-${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');
    
    // 一時的なBrowserWindowを作成してHTMLをロード
    const tempWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    await tempWindow.loadFile(tempHtmlPath);
    
    // PDFを生成
    const pdfBytes = await tempWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        marginType: 'printableArea'
      }
    });
    
    // 一時的なウィンドウとファイルをクリーンアップ
    tempWindow.close();
    fs.unlinkSync(tempHtmlPath);
    // ▲▲▲ ここまで修正 ▲▲▲

    const { filePath } = await dialog.showSaveDialog(mainWindow, { 
        title: 'レポートを保存', 
        defaultPath: `Kage合理的配慮レポート_${new Date().toISOString().slice(0,10)}.pdf` 
    });

    if (filePath) {
      fs.writeFileSync(filePath, pdfBytes);
      return { success: true, message: `レポートが保存されました。` };
    } else {
      return { success: false, message: '保存がキャンセルされました。' };
    }
  } catch (error) {
    log.error('PDF generation failed:', error);
    return { success: false, message: `PDFレポートの生成に失敗しました: ${error.message}` };
  }
});

// Stripe Checkoutセッション作成の処理
ipcMain.handle('create-checkout-session', async () => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        { price: 'price_1RmYiIRhh0YbRyvV9bJG7N3v', quantity: 1 },
      ],
      mode: 'subscription',
      success_url: 'https://effulgent-marzipan-17f896.netlify.app/success.html',
      cancel_url: 'https://effulgent-marzipan-17f896.netlify.app/cancel.html',
    });
    return { success: true, url: session.url };
  } catch (error) {
    log.error('Failed to create Stripe Checkout session:', error);
    return { success: false, message: `決済ページの作成に失敗しました: ${error.message}` };
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
  const ipcHandlers = new IPCHandlers();
  log.info('[BFF] BFF統合のためのIPCハンドラーが初期化されました。');
  log.info('[BFF] ポート8080でBFFサーバーが起動していることを確認してください。');

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