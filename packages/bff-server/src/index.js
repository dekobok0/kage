
const express = require('express');

// Expressアプリを作成します
const app = express();

// アプリがJSON形式のリクエストを理解できるように設定します
app.use(express.json());

// サーバーが動作しているか確認するためのシンプルなルート
app.get('/', (req, res) => {
  res.send('Kageサーバーは正常に動作しています！');
});

// ★★★ ここが将来、Electronアプリからのリクエストを受け付ける窓口になります ★★★
app.post('/api/transcribe', (req, res) => {
  console.log('クライアントからリクエストを受け取りました。');
  
  // 今はまだAI処理は行わず、固定のテスト用メッセージを返します
  // これにより、クライアントとの通信が正しくできているかを確認できます
  res.json({
    message: 'サーバーがリクエストを受け付けました！',
    transcript: '（ここに将来、文字起こし結果が入ります）'
  });
});

// サーバーを起動するポート番号を設定します
// Cloud Runのような環境では環境変数PORTが使われ、なければ8080番ポートを使います
const PORT = process.env.PORT || 8080;

// サーバーを起動し、リクエストを待ち受けます
app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました。`);
});