// src/renderer.js

// HTMLから表示要素を取得しておく
const userQuestionElement = document.getElementById('user-question');
const aiAnswerElement = document.getElementById('ai-answer');

// preload.js で用意された 'api' を通じて、メインプロセスからのデータ受信を待つ
window.api.onPythonData((data) => {
  // 開発者ツールにもログを出力しておくとデバッグに便利
  console.log('UI側で受信:', data);

  // 受け取ったデータの種類 (type) に応じて、表示を切り替える
  switch (data.type) {
    case 'user_question':
      // ユーザーの質問を表示し、AIの回答エリアを初期化
      userQuestionElement.textContent = data.data;
      aiAnswerElement.textContent = ''; 
      break;

    case 'ai_status':
      // AIのステータスを表示
      if (data.data === 'generating') {
        aiAnswerElement.textContent = 'AIが回答を生成中...';
      }
      break;

    case 'ai_chunk':
      // AIからの回答を、リアルタイムで追記していく
      if (aiAnswerElement.textContent === 'AIが回答を生成中...') {
        aiAnswerElement.textContent = ''; // 「生成中...」の文字を消す
      }
      aiAnswerElement.textContent += data.data;
      break;

    case 'error':
      // エラーが発生した場合、赤文字で表示
      aiAnswerElement.style.color = 'red';
      aiAnswerElement.textContent = `エラーが発生しました: ${data.data}`;
      break;
  }
});