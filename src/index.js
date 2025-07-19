// src/index.js (Stripe実装を含む最終版)

if (process.stdout.isTTY) {
  process.stdout.reconfigure({ encoding: 'utf-8' });
}
if (process.stderr.isTTY) {
  process.stderr.reconfigure({ encoding: 'utf-8' });
}

// --- モジュールのインポート ---
const { app, BrowserWindow, ipcMain, safeStorage, dialog, shell } = require('electron');
const path = require('node:path');
const { spawn } = require('child_process');
const readline = require('node:readline');
const Store = require('electron-store').default;
const log = require('electron-log');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const Stripe = require('stripe');



// 1. ElectronのAPIを使い、アプリケーションのルートパスを確実に取得します。
const appRootPath = app.getAppPath();

// 2. ルートパスと'.env'ファイル名を結合して、.envファイルへの絶対パスを生成します。
const dotEnvPath = path.join(appRootPath, '.env');

// 3. デバッグ用に、計算されたパスとファイルの存在を確認するログを出力します。
log.info(`.envファイルの読み込みを試行します。パス: ${dotEnvPath}`);
if (fs.existsSync(dotEnvPath)) {
  log.info(`.env ファイルが指定されたパスに存在することを確認しました。`);
} else {
  // このエラーが出た場合、.envファイルがプロジェクトのルートにないか、ファイル名が間違っています。
  log.error(` 致命的エラー:.env ファイルが指定されたパスに見つかりません: ${dotEnvPath}`);
}

// 4. dotenvに、算出した絶対パスを'path'オプションで明示的に指定して設定を読み込みます。
require('dotenv').config({ path: dotEnvPath });

// 5. 読み込みが成功したかを確認するための最終チェック
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
  log.info(`Stripe Secret Keyが正常にprocess.envにロードされました。`);
} else {
  log.error(` 致命的エラー: Stripe Secret Keyのprocess.envへのロードに失敗しました。`);
}
// ▲▲▲ ここまでが修正箇所 ▲▲▲




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

// --- Stripeの初期化 ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); 

let mainWindow;

if (require('electron-squirrel-startup')) {
  app.quit();
}

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

  mainWindow.webContents.on('did-finish-load', () => {
    try {
      const encryptedProfile = store.get('userProfile');
      if (encryptedProfile && Object.keys(encryptedProfile).length > 0 && safeStorage.isEncryptionAvailable()) {
        const decryptedProfile = {
          characteristics: encryptedProfile.encryptedCharacteristics ? safeStorage.decryptString(Buffer.from(encryptedProfile.encryptedCharacteristics, 'base64')) : '',
          resume: encryptedProfile.encryptedResume ? safeStorage.decryptString(Buffer.from(encryptedProfile.encryptedResume, 'base64')) : ''
        };
        log.info('Successfully loaded and decrypted profile for UI.');
        mainWindow.webContents.send('profile-loaded', decryptedProfile);
      } else {
        log.info('No profile found or encryption not available. Skipping profile load.');
      }
    } catch (error) {
      log.error('Failed to load and decrypt profile:', error);
      store.set('userProfile', {});
    }
  });
};

ipcMain.on('save-profile', (event, profileData) => {
  if (!safeStorage.isEncryptionAvailable()) {
    log.error('Encryption is not available on this system. Profile not saved.');
    return;
  }
  try {
    const encryptedCharacteristics = safeStorage.encryptString(profileData.characteristics);
    const encryptedResume = safeStorage.encryptString(profileData.resume);
    const encryptedProfile = {
      encryptedCharacteristics: encryptedCharacteristics.toString('base64'),
      encryptedResume: encryptedResume.toString('base64')
    };
    store.set('userProfile', encryptedProfile);
    log.info('Successfully encrypted and saved profile.');
  } catch (error) {
    log.error('Failed to encrypt and save profile:', error);
  }
});

// レポート生成とPDF化の処理
ipcMain.handle('generate-report', async (event) => {
  log.info('Report generation requested.');
  const encryptedProfile = store.get('userProfile');
  const startTimeISO = store.get('interviewStartTime');
  const hintCount = store.get('hintCount', 0);
  const conversationLog = store.get('conversationLog', []);
  if (!encryptedProfile || !encryptedProfile.encryptedCharacteristics) {
    return { success: false, message: 'エラー: プロフィール情報が保存されていません。' };
  }
  let decryptedCharacteristics;
  try {
    decryptedCharacteristics = safeStorage.decryptString(Buffer.from(encryptedProfile.encryptedCharacteristics, 'base64'));
  } catch(e) {
    return { success: false, message: 'エラー: プロフィール情報の読み込みに失敗しました。' };
  }
  const startTime = new Date(startTimeISO);
  const endTime = new Date();
  const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
  const formatDate = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  let qaLogText = '（記録なし）';
  if (conversationLog.length > 0) {
    qaLogText = conversationLog.map((item, index) => {
      if (item.type === 'Q') {
        const nextItem = conversationLog[index + 1];
        const answer = (nextItem && nextItem.type === 'A_chunk') ? nextItem.content : '';
        const summary = answer.length > 80 ? answer.substring(0, 80) + '...' : answer;
        return `\n質問${Math.floor(index/2) + 1}: ${item.content}\n └─ AI提示ヒント: 「${summary.replace(/\n/g, ' ')}」\n`;
      }
      return '';
    }).join('');
  }
  const reportText = `...`; // 省略: あなたのレポートテキスト生成ロジックはここにあります
  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const fontBytes = fs.readFileSync(path.join(__dirname, '..', 'assets', 'ipaexg.ttf'));
    const customFont = await pdfDoc.embedFont(fontBytes);
    const page = pdfDoc.addPage();
    page.drawText(reportText.trim(), { x: 50, y: page.getHeight() - 50, font: customFont, size: 10, lineHeight: 14 });
    const pdfBytes = await pdfDoc.save();
    const { filePath } = await dialog.showSaveDialog(mainWindow, { title: 'レポートを保存', defaultPath: `Kage合理的配慮レポート_${new Date().toISOString().slice(0,10)}.pdf` });
    if (filePath) {
      fs.writeFileSync(filePath, pdfBytes);
      return { success: true, message: `レポートが保存されました。` };
    } else {
      return { success: false, message: '保存がキャンセルされました。' };
    }
  } catch (error) {
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
      success_url: `file://${path.join(__dirname, 'success.html')}`,
      cancel_url: `file://${path.join(__dirname, 'cancel.html')}`,
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


// Pythonプロセスを起動する関数
function spawnPython(scriptName, options = {}) {
  // ... (この関数の中身は変更ありません) ...
  const pythonPath = options.pythonPath;
  const scriptPath = options.scriptPath;
  const pyProcess = spawn(pythonPath, [scriptName], { cwd: scriptPath, shell: false, windowsHide: true, env: { ...process.env, PYTHONUTF8: '1' } });
  let profileForPython = { characteristics: '', resume: '' };
  try {
    const encryptedProfile = store.get('userProfile');
    if (encryptedProfile && safeStorage.isEncryptionAvailable()) {
        profileForPython = {
            characteristics: encryptedProfile.encryptedCharacteristics ? safeStorage.decryptString(Buffer.from(encryptedProfile.encryptedCharacteristics, 'base64')) : '',
            resume: encryptedProfile.encryptedResume ? safeStorage.decryptString(Buffer.from(encryptedProfile.encryptedResume, 'base64')) : ''
        };
    }
  } catch (error) { log.error('Could not decrypt profile for Python backend', error); }
  pyProcess.stdin.write(JSON.stringify(profileForPython) + '\n');
  const rl = readline.createInterface({ input: pyProcess.stdout });
  rl.on('line', (line) => {
    try {
      const parsedData = JSON.parse(line);
      // ... (ログ記録のロジックは変更ありません) ...
      if (mainWindow) { mainWindow.webContents.send('from-python', parsedData); }
    } catch (error) { log.warn(`Python stdout (not JSON line): ${line}`); }
  });
  // ... (stderrやcloseイベントのリスナーは変更ありません) ...
}

// --- アプリケーションのライフサイクル ---
app.whenReady().then(() => {
  createWindow();
  const projectRoot = app.getAppPath();
  const pythonExecutablePath = path.join(projectRoot, 'python_assets', 'venv', 'Scripts', 'python.exe');
  const scriptDir = path.join(projectRoot, 'python_assets');
  spawnPython('step_final.py', { pythonPath: pythonExecutablePath, scriptPath: scriptDir });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });