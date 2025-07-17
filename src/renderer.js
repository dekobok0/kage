// src/renderer.js

// HTMLから表示要素を取得しておく
const userQuestionElement = document.getElementById('user-question');
const aiAnswerElement = document.getElementById('ai-answer');

// ▼▼▼ このブロックを追加 ▼▼▼
const profileForm = document.getElementById('profile-form');
const userCharacteristicsElement = document.getElementById('user-characteristics');
const resumeInputElement = document.getElementById('resume-input');
const saveStatusElement = document.getElementById('save-status');
// ▲▲▲ ここまで ▲▲▲

// ▼▼▼ このブロックを追加 ▼▼▼
// フォームの送信（保存ボタンクリック）イベントを処理
profileForm.addEventListener('submit', (event) => {
  event.preventDefault(); // フォームのデフォルトの送信動作をキャンセル

  const profileData = {
      characteristics: userCharacteristicsElement.value,
      resume: resumeInputElement.value,
  };

  window.api.saveProfile(profileData);

  // ユーザーに保存されたことをフィードバック
  saveStatusElement.textContent = '保存しました！';
  setTimeout(() => {
      saveStatusElement.textContent = '';
  }, 2000); // 2秒後にメッセージを消す
});
// ▲▲▲ ここまで ▲▲▲

// ▼▼▼ このブロックを追加 ▼▼▼
// 起動時にメインプロセスから送られてくるプロフィールデータをセットする
window.api.onProfileLoaded((profileData) => {
  console.log('UI側でプロフィールを受信:', profileData);
  userCharacteristicsElement.value = profileData.characteristics || '';
  resumeInputElement.value = profileData.resume || '';
});
// ▲▲▲ ここまで ▲▲▲



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


// ▼▼▼ このブロックを末尾に追加 ▼▼▼
// レポート機能のための要素を取得
const generateReportButton = document.getElementById('generate-report-button');
const reportOutputElement = document.getElementById('report-output');

// 「レポートを生成」ボタンがクリックされたときの処理
generateReportButton.addEventListener('click', async () => {
  try {
    // ボタンのテキストを「生成中...」に変更
    generateReportButton.textContent = '生成中...';
    generateReportButton.disabled = true;

    // 厨房(メインプロセス)にレポート作成を依頼し、返事を待つ
    const reportText = await window.api.generateReport();
    
    // 返ってきたレポートを画面に表示
    reportOutputElement.textContent = reportText;

  } catch (error) {
    // エラーが発生した場合
    reportOutputElement.textContent = `レポートの生成に失敗しました: ${error.message}`;
  } finally {
    // ボタンのテキストを元に戻す
    generateReportButton.textContent = 'レポートを生成';
    generateReportButton.disabled = false;
  }
});
// ▲▲▲ ここまで ▲▲▲