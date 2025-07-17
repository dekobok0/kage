// src/index.js (レポート強化版)

if (process.stdout.isTTY) {
  process.stdout.reconfigure({ encoding: 'utf-8' });
}
if (process.stderr.isTTY) {
  process.stderr.reconfigure({ encoding: 'utf-8' });
}

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { spawn } = require('child_process');
const readline = require('node:readline');
const Store = require('electron-store').default;

let mainWindow;
const store = new Store();

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

  // ★★★ ステップ1: 面接開始時刻と各種ログを初期化 ★★★
  store.set('interviewStartTime', new Date().toISOString());
  store.set('hintCount', 0); // AI支援回数カウンター
  store.set('conversationLog', []); // Q&Aログ

  mainWindow.webContents.on('did-finish-load', () => {
    const userProfile = store.get('userProfile');
    if (userProfile) {
      console.log('保存されたプロフィールを読み込みました:', userProfile);
      mainWindow.webContents.send('profile-loaded', userProfile);
    }
  });
};

ipcMain.on('save-profile', (event, profileData) => {
  try {
    store.set('userProfile', profileData);
    console.log('プロフィールを保存しました:', profileData);
  } catch (error) {
    console.error('プロフィールの保存に失敗しました:', error);
  }
});

// ★★★ レポート生成ロジックを大幅に強化 ★★★
ipcMain.handle('generate-report', (event) => {
  console.log('レポート生成の要求を受け取りました。');
  const userProfile = store.get('userProfile');
  const startTimeISO = store.get('interviewStartTime');
  const hintCount = store.get('hintCount', 0);
  const conversationLog = store.get('conversationLog', []);

  if (!userProfile || (!userProfile.characteristics && !userProfile.resume)) {
    return 'エラー: プロフィール情報が保存されていません。先にプロフィールを保存してください。';
  }

  // --- タイムスタンプ関連の処理 ---
  const startTime = new Date(startTimeISO);
  const endTime = new Date();
  const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
  const formatDate = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

  // --- Q&Aログを整形する ---
  let qaLogText = '（記録なし）';
  if (conversationLog.length > 0) {
      qaLogText = '';
      let questionCounter = 1;
      let currentAnswer = '';
      conversationLog.forEach(item => {
          if (item.type === 'Q') {
              if(currentAnswer) { // 前の回答があれば確定させる
                  const summary = currentAnswer.length > 80 ? currentAnswer.substring(0, 80) + '...' : currentAnswer;
                  qaLogText += ` └─ AI提示ヒント: 「${summary.replace(/\n/g, ' ')}」\n`;
                  currentAnswer = '';
              }
              qaLogText += `\n質問${questionCounter}: ${item.content}\n`;
              questionCounter++;
          } else if (item.type === 'A_chunk') {
              currentAnswer += item.content;
          }
      });
      // 最後の回答を確定させる
      if(currentAnswer) {
          const summary = currentAnswer.length > 80 ? currentAnswer.substring(0, 80) + '...' : currentAnswer;
          qaLogText += ` └─ AI提示ヒント: 「${summary.replace(/\n/g, ' ')}」\n`;
      }
  }


  // --- レポートの文章を組み立てる ---
  const reportText = `
--------------------------------------------------
合理的配慮の提供に関する報告書
--------------------------------------------------

報告日: ${formatDate(endTime)}

**1. 面接実施記録**
 - 面接開始時刻: ${formatDate(startTime)}
 - 面接終了時刻: ${formatDate(endTime)}
 - 総所要時間: 約 ${durationMinutes} 分

**2. 提供された支援の概要**
本日の面接選考において、候補者の特性に応じた情報保障およびコミュニケーション支援のため、リアルタイムAI面接支援ツール「Kage」が利用されました。これは、改正障害者差別解消法に基づく「合理的配慮の提供」の一環として実施されたものです。

**3. 提供された支援の詳細**
 - **AIによるリアルタイム回答支援の利用回数:** ${hintCount} 回
 - **申告された特性・配慮点:**
   ${userProfile.characteristics || '（記載なし）'}

**4. ツール利用の詳細（Q&Aログ）**
${qaLogText.trim()}

**5. 免責事項**
本レポートは、合理的配慮の提供努力を文書化するものであり、選考の合否を保証または示唆するものではありません。

--------------------------------------------------
`;

  return reportText.trim();
});


function spawnPython(scriptName, options = {}) {
  const pythonPath = options.pythonPath;
  const scriptPath = options.scriptPath;

  const pyProcess = spawn(pythonPath, [scriptName], {
    cwd: scriptPath,
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
      PYTHONUTF8: '1',
    },
  });

  const userProfile = store.get('userProfile');
  if (userProfile) {
    const profileString = JSON.stringify(userProfile) + '\n';
    pyProcess.stdin.write(profileString);
    console.log('Pythonにプロフィール情報を送信しました。');
  } else {
    const emptyProfile = JSON.stringify({ characteristics: '', resume: ''}) + '\n';
    pyProcess.stdin.write(emptyProfile);
    console.log('プロフィールが空のため、空の情報を送信しました。');
  }

  const rl = readline.createInterface({ input: pyProcess.stdout });

  rl.on('line', (line) => {
    try {
      const parsedData = JSON.parse(line);

      // ★★★ ステップ1: AIの回答完了を検知してカウンターを更新 ★★★
      if (parsedData.type === 'ai_status' && parsedData.data === 'done') {
        const currentCount = store.get('hintCount', 0);
        store.set('hintCount', currentCount + 1);
        console.log(`AI支援回数をインクリメント: ${currentCount + 1}`);
      }
      
      // ★★★ ステップ2: Q&Aログを記録 ★★★
      if (parsedData.type === 'user_question') {
          const log = store.get('conversationLog', []);
          log.push({ type: 'Q', content: parsedData.data, timestamp: new Date().toISOString() });
          store.set('conversationLog', log);
      } else if (parsedData.type === 'ai_chunk') {
          const log = store.get('conversationLog', []);
          log.push({ type: 'A_chunk', content: parsedData.data, timestamp: new Date().toISOString() });
          store.set('conversationLog', log);
      }

      if (mainWindow) {
        console.log(`[IPC] Sending to renderer:`, parsedData);
        mainWindow.webContents.send('from-python', parsedData);
      }
    } catch (error) {
      console.log(`Python stdout (not JSON line): ${line}`);
    }
  });

  const errRl = readline.createInterface({ input: pyProcess.stderr });
  errRl.on('line', (line) => {
    console.error(`Python stderr: ${line}`);
  });

  pyProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  createWindow();

  console.log('Pythonバックエンドの起動を試みます...');

  const projectRoot = app.getAppPath();
  const pythonExecutablePath = path.join(projectRoot, 'python_assets', 'venv', 'Scripts', 'python.exe');
  const scriptDir = path.join(projectRoot, 'python_assets');
  
  spawnPython('step_final.py', {
    pythonPath: pythonExecutablePath,
    scriptPath: scriptDir,
  });

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