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

// BFF統合のための新しいモジュール
const IPCHandlers = require('./main/ipcHandlers');
const ReportService = require('./main/reportService');


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

// ReportServiceを使用するため、古いヘルパー関数は削除

// ReportServiceでStripeを管理するため、ここでの初期化は不要

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

// レポート生成のIPCハンドラー
ipcMain.handle('generate-report', async (event) => {
  log.info('Report generation requested.');

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

    // 4. 一時的なHTMLファイルを作成してPDF生成
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
    const reportService = new ReportService();
    const result = await reportService.createCheckoutSession();
    return result;
  } catch (error) {
    log.error('Failed to create Stripe Checkout session:', error);
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