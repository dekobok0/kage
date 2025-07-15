// src/index.js (readlineを使った最終版)
// ▼▼▼ このブロックをファイルの先頭に追加してください ▼▼▼
// Node.jsの標準出力/エラー出力のエンコーディングを強制的にUTF-8に設定します。
// これにより、ターミナルの設定に関わらず、console.logがUTF-8で出力されるようになります。
if (process.stdout.isTTY) {
  process.stdout.reconfigure( { encoding: 'utf-8' });
}
if (process.stderr.isTTY) {
  process.stderr.reconfigure( { encoding: 'utf-8' });
}
// ▲▲▲ ここまで ▲▲▲

const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { spawn } = require('child_process');
const readline = require('node:readline'); // ★ readlineモジュールをインポート

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
};

function spawnPython(scriptName, options = {}) {
  const pythonPath = options.pythonPath;
  const scriptPath = options.scriptPath;
  const isWindows = process.platform === 'win32';
  const pyProcess = spawn(pythonPath, [scriptName], { cwd: scriptPath, shell: isWindows });

  // ★ Pythonからの出力を、行単位で効率的に処理するインターフェースを作成
  const rl = readline.createInterface({ input: pyProcess.stdout });

  // ★ 'line'イベントは、改行が検出されるたびに、完全な一行を保証して発火する
  rl.on('line', (line) => {
    try {
      const parsedData = JSON.parse(line);
      if (mainWindow) {
        console.log(`[IPC] Sending to renderer:`, parsedData);
        mainWindow.webContents.send('from-python', parsedData);
      }
    } catch (error) {
      // このログは、Python側でJSONではないprint文が実行された場合にのみ表示される
      console.log(`Python stdout (not JSON line): ${line}`);
    }
  });

  // エラー出力も行単位で処理すると、より見やすくなる
  const errRl = readline.createInterface({ input: pyProcess.stderr });
  errRl.on('line', (line) => {
    console.error(`Python stderr: ${line}`);
  });

  pyProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

// Electronの準備が完了したら実行
app.whenReady().then(() => {
  createWindow();

  console.log('Pythonバックエンドの起動を試みます...');

  const projectRoot = app.getAppPath();


 //const pythonExecutablePath = path.join(projectRoot, 'venv', 'Scripts', 'python.exe');
 // ▼▼▼ 変更点 1 ▼▼▼
  // 仮想環境(venv)内のPython実行ファイルのパス
  // 変更前: const pythonExecutablePath = path.join(projectRoot, 'venv', 'Scripts', 'python.exe');
  const pythonExecutablePath = path.join(projectRoot, 'python_assets', 'venv', 'Scripts', 'python.exe');


  //const scriptDir = path.join(projectRoot, 'src', 'python');
   // ▼▼▼ 変更点 2 ▼▼▼
  // Pythonスクリプトがあるディレクトリのパス
  // 変更前: const scriptDir = path.join(projectRoot, 'src', 'python');
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