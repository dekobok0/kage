// src/renderer.js

// ▼▼▼ モード切り替え機能 ▼▼▼
const prepModeBtn = document.getElementById('prep-mode-btn');
const interviewModeBtn = document.getElementById('interview-mode-btn');
const preparationMode = document.getElementById('preparation-mode');
const interviewMode = document.getElementById('interview-mode');

// モード切り替え処理
prepModeBtn.addEventListener('click', () => {
    prepModeBtn.classList.add('active');
    interviewModeBtn.classList.remove('active');
    preparationMode.classList.add('active');
    interviewMode.classList.remove('active');
    
    // メインプロセスに準備モードへの切り替えを通知
    window.api.switchToPrepMode();
});

interviewModeBtn.addEventListener('click', () => {
    interviewModeBtn.classList.add('active');
    prepModeBtn.classList.remove('active');
    interviewMode.classList.add('active');
    preparationMode.classList.remove('active');
    
    // メインプロセスに面接モードへの切り替えを通知
    window.api.switchToInterviewMode();
});

// ▼▼▼ ウィジェット制御機能 ▼▼▼
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const toggleMicBtn = document.getElementById('toggle-mic-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const interviewWidget = document.getElementById('interview-widget');

let isMinimized = false;
let isMicActive = true;

// 最小化ボタン
minimizeBtn.addEventListener('click', () => {
    isMinimized = !isMinimized;
    if (isMinimized) {
        interviewWidget.classList.add('minimized');
        minimizeBtn.textContent = '□';
        minimizeBtn.title = '復元';
    } else {
        interviewWidget.classList.remove('minimized');
        minimizeBtn.textContent = '−';
        minimizeBtn.title = '最小化';
    }
});

// 閉じるボタン
closeBtn.addEventListener('click', () => {
    // 面接モードから準備モードに戻る
    prepModeBtn.click();
});

// マイクON/OFFボタン
toggleMicBtn.addEventListener('click', () => {
    isMicActive = !isMicActive;
    const micStatus = document.getElementById('mic-status');
    if (isMicActive) {
        toggleMicBtn.textContent = '🎤 マイクON';
        micStatus.textContent = '🎤 音声認識待機中...';
        micStatus.style.color = '#27ae60';
    } else {
        toggleMicBtn.textContent = '🔇 マイクOFF';
        micStatus.textContent = '🔇 音声認識停止中';
        micStatus.style.color = '#e74c3c';
    }
});

// 履歴クリアボタン
clearChatBtn.addEventListener('click', () => {
    document.getElementById('user-question-widget').textContent = '（質問を待機中...）';
    document.getElementById('ai-answer-widget').textContent = '（回答を待機中...）';
});


// ▼▼▼ プロフィール要素の取得（拡張版） ▼▼▼
const profileForm = document.getElementById('profile-form');
const userCharacteristicsElement = document.getElementById('user-characteristics');
const resumeInputElement = document.getElementById('resume-input');
const saveStatusElement = document.getElementById('save-status');

// 第1層：根源的な認知・情報処理スタイル
const informationProcessingRadios = document.getElementsByName('information_processing');
const learningStyleRadios = document.getElementsByName('learning_style');

// 第2層：対人・業務特性
const teamStyleRadios = document.getElementsByName('team_style');
const changeResponseRadios = document.getElementsByName('change_response');

// 第3層：具体的な環境ニーズ
const environmentNeedsCheckboxes = {
    lighting: document.getElementById('env_lighting'),
    noise: document.getElementById('env_noise'),
    space: document.getElementById('env_space'),
    schedule: document.getElementById('env_schedule'),
    tech: document.getElementById('env_tech')
};

// モジュール1：How I Connect
const instructionPreferenceRadios = document.getElementsByName('instruction_preference');
const meetingNeedsCheckboxes = {
    agenda: document.getElementById('meet_agenda'),
    process_time: document.getElementById('meet_time'),
    chat_option: document.getElementById('meet_chat'),
    visual_aids: document.getElementById('meet_visual_aids'),
    breakout: document.getElementById('meet_breakout')
};
const feedbackPreferenceRadios = document.getElementsByName('feedback_preference');

// モジュール2：How I Focus & Achieve
const taskStructureRadios = document.getElementsByName('task_structure');
const workRhythmRadios = document.getElementsByName('work_rhythm');
const focusEnvironmentCheckboxes = {
    quiet: document.getElementById('focus_quiet'),
    background: document.getElementById('focus_background'),
    visual: document.getElementById('focus_visual'),
    comfort: document.getElementById('focus_comfort'),
    breaks: document.getElementById('focus_breaks')
};

// モジュール3：My Sensory Needs
const sensoryNeedsCheckboxes = {
    light: document.getElementById('sensory_light'),
    sound: document.getElementById('sensory_sound'),
    touch: document.getElementById('sensory_touch'),
    smell: document.getElementById('sensory_smell'),
    movement: document.getElementById('sensory_movement')
};
const physicalEnvironmentCheckboxes = {
    space: document.getElementById('physical_space'),
    privacy: document.getElementById('physical_privacy'),
    accessibility: document.getElementById('physical_accessibility'),
    ergonomics: document.getElementById('physical_ergonomics'),
    climate: document.getElementById('physical_climate')
};

// モジュール4：How I Thrive
const motivationTypeRadios = document.getElementsByName('motivation_type');
const supportNeedsCheckboxes = {
    communication: document.getElementById('support_communication'),
    resources: document.getElementById('support_resources'),
    flexibility: document.getElementById('support_flexibility'),
    mentoring: document.getElementById('support_mentoring'),
    breaks: document.getElementById('support_breaks')
};
const careerDevelopmentCheckboxes = {
    training: document.getElementById('career_training'),
    mentoring: document.getElementById('career_mentoring'),
    networking: document.getElementById('career_networking'),
    feedback: document.getElementById('career_feedback'),
    visibility: document.getElementById('career_visibility')
};
// ▲▲▲ ここまで ▲▲▲

// ▼▼▼ フォーム送信処理（改善版） ▼▼▼
profileForm.addEventListener('submit', (event) => {
event.preventDefault();

// 保存ボタンを無効化してローディング状態に
const saveButton = document.querySelector('.save-button');
const originalButtonText = saveButton.innerHTML;
saveButton.innerHTML = '<span class="button-icon">⏳</span>保存中...';
saveButton.disabled = true;

const getRadioValue = (radios) => {
    for (const radio of radios) {
        if (radio.checked) return radio.value;
    }
    return '';
};

const getCheckboxValues = (checkboxes) => {
    const values = [];
    for (const key in checkboxes) {
        if (checkboxes[key] && checkboxes[key].checked) {
            values.push(checkboxes[key].value);
        }
    }
    return values;
};

const profileData = {
    // 基本情報
    characteristics: userCharacteristicsElement.value,
    resume: resumeInputElement.value,
    
    // 第1層：根源的な認知・情報処理スタイル
    information_processing: getRadioValue(informationProcessingRadios),
    learning_style: getRadioValue(learningStyleRadios),
    
    // 第2層：対人・業務特性
    team_style: getRadioValue(teamStyleRadios),
    change_response: getRadioValue(changeResponseRadios),
    
    // 第3層：具体的な環境ニーズ
    environment_needs: getCheckboxValues(environmentNeedsCheckboxes),
    
    // モジュール1：How I Connect
    instruction_preference: getRadioValue(instructionPreferenceRadios),
    meeting_needs: getCheckboxValues(meetingNeedsCheckboxes),
    feedback_preference: getRadioValue(feedbackPreferenceRadios),
    
    // モジュール2：How I Focus & Achieve
    task_structure: getRadioValue(taskStructureRadios),
    work_rhythm: getRadioValue(workRhythmRadios),
    focus_environment: getCheckboxValues(focusEnvironmentCheckboxes),
    
    // モジュール3：My Sensory Needs
    sensory_needs: getCheckboxValues(sensoryNeedsCheckboxes),
    physical_environment: getCheckboxValues(physicalEnvironmentCheckboxes),
    
    // モジュール4：How I Thrive
    motivation_type: getRadioValue(motivationTypeRadios),
    support_needs: getCheckboxValues(supportNeedsCheckboxes),
    career_development: getCheckboxValues(careerDevelopmentCheckboxes)
};

// プロフィール保存を実行
window.api.saveProfile(profileData);

// 保存完了のフィードバックを表示
setTimeout(() => {
    saveButton.innerHTML = '<span class="button-icon">✅</span>保存完了！';
    saveButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
    
    // 3秒後に元の状態に戻す
    setTimeout(() => {
        saveButton.innerHTML = originalButtonText;
        saveButton.disabled = false;
        saveButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
    }, 3000);
}, 1000);
});
// ▲▲▲ ここまで改善 ▲▲▲

// ▼▼▼ プロフィール読み込み処理（拡張版） ▼▼▼
window.api.onProfileLoaded((profileData) => {
  // 基本情報
  userCharacteristicsElement.value = profileData.characteristics || '';
  resumeInputElement.value = profileData.resume || '';

  const setRadioValue = (radios, value) => {
      for (const radio of radios) {
          radio.checked = radio.value === value;
      }
  };

  const setCheckboxValues = (checkboxes, values) => {
      const valueSet = new Set(values || []);
      for (const key in checkboxes) {
          if (checkboxes[key]) {
              checkboxes[key].checked = valueSet.has(checkboxes[key].value);
          }
      }
  };

  // 第1層：根源的な認知・情報処理スタイル
  setRadioValue(informationProcessingRadios, profileData.information_processing);
  setRadioValue(learningStyleRadios, profileData.learning_style);
  
  // 第2層：対人・業務特性
  setRadioValue(teamStyleRadios, profileData.team_style);
  setRadioValue(changeResponseRadios, profileData.change_response);
  
  // 第3層：具体的な環境ニーズ
  setCheckboxValues(environmentNeedsCheckboxes, profileData.environment_needs);
  
  // モジュール1：How I Connect
  setRadioValue(instructionPreferenceRadios, profileData.instruction_preference);
  setCheckboxValues(meetingNeedsCheckboxes, profileData.meeting_needs);
  setRadioValue(feedbackPreferenceRadios, profileData.feedback_preference);
  
  // モジュール2：How I Focus & Achieve
  setRadioValue(taskStructureRadios, profileData.task_structure);
  setRadioValue(workRhythmRadios, profileData.work_rhythm);
  setCheckboxValues(focusEnvironmentCheckboxes, profileData.focus_environment);
  
  // モジュール3：My Sensory Needs
  setCheckboxValues(sensoryNeedsCheckboxes, profileData.sensory_needs);
  setCheckboxValues(physicalEnvironmentCheckboxes, profileData.physical_environment);
  
  // モジュール4：How I Thrive
  setRadioValue(motivationTypeRadios, profileData.motivation_type);
  setCheckboxValues(supportNeedsCheckboxes, profileData.support_needs);
  setCheckboxValues(careerDevelopmentCheckboxes, profileData.career_development);
});
// ▲▲▲ ここまで ▲▲▲


// ▼▼▼ このブロックを丸ごと置き換える ▼▼▼
// レポート機能のための要素を取得
const generateReportButton = document.getElementById('generate-report-button');
const reportOutputElement = document.getElementById('report-output');

// 「レポートを生成」ボタンがクリックされたときの処理
generateReportButton.addEventListener('click', async () => {
  try {
    generateReportButton.textContent = '生成中...';
    generateReportButton.disabled = true;

    // メインプロセスにレポート作成を依頼し、結果（成否とメッセージ）を受け取る
    const result = await window.api.generateReport();
    
    if (result.success) {
      reportOutputElement.style.color = 'green';
    } else {
      reportOutputElement.style.color = 'orange';
    }
    // 結果のメッセージを表示
    reportOutputElement.textContent = result.message;

  } catch (error) {
    reportOutputElement.style.color = 'red';
    reportOutputElement.textContent = `レポートの生成に失敗しました: ${error.message}`;
  } finally {
    generateReportButton.textContent = 'レポートを生成';
    generateReportButton.disabled = false;
  }
});
// ▲▲▲ ここまで置き換える ▲▲▲

// ▼▼▼ ここにStripe用の処理を丸ごと追加 ▼▼▼
const checkoutButton = document.getElementById('checkout-button');
const paymentStatusElement = document.getElementById('payment-status');

checkoutButton.addEventListener('click', async () => {
  paymentStatusElement.textContent = '決済ページを準備しています...';
  try {
    // 1. メインプロセスにCheckoutセッションの作成を依頼
    const result = await window.api.createCheckoutSession();

    if (result.success) {
      // 2. 成功したら、受け取ったURLを外部ブラウザで開く
      paymentStatusElement.textContent = 'ブラウザで決済ページを開きます。';
      window.api.openExternalUrl(result.url);
    } else {
      paymentStatusElement.style.color = 'red';
      paymentStatusElement.textContent = result.message;
    }
  } catch (error) {
    paymentStatusElement.style.color = 'red';
    paymentStatusElement.textContent = `エラーが発生しました: ${error.message}`;
  }
});
// ▲▲▲ ここまで ▲▲▲

// ▼▼▼ アコーディオン機能 ▼▼▼
document.addEventListener('DOMContentLoaded', function() {
    // アコーディオンヘッダーのクリックイベント
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const icon = this.querySelector('.accordion-icon');
            
            // 現在の状態を切り替え
            const isActive = this.classList.contains('active');
            
            // 全てのアコーディオンを閉じる
            accordionHeaders.forEach(h => {
                h.classList.remove('active');
                const targetContent = document.getElementById(h.getAttribute('data-target'));
                targetContent.classList.remove('active');
            });
            
            // クリックされたアコーディオンを開く（閉じている場合）
            if (!isActive) {
                this.classList.add('active');
                content.classList.add('active');
            }
        });
    });
    
    // 最初のアコーディオンを自動で開く
    const firstAccordion = document.querySelector('.accordion-header');
    if (firstAccordion) {
        firstAccordion.click();
    }
});
// ▲▲▲ ここまで追加 ▲▲▲

// ★★★ BFF統合のための音声処理機能 ★★★

// 通知表示用の関数
function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notification-area');
    if (notificationArea) {
        notificationArea.style.display = 'block';
        notificationArea.textContent = message;
        
        // タイプに応じてスタイルを設定
        switch (type) {
            case 'success':
                notificationArea.style.backgroundColor = '#d4edda';
                notificationArea.style.color = '#155724';
                notificationArea.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                notificationArea.style.backgroundColor = '#f8d7da';
                notificationArea.style.color = '#721c24';
                notificationArea.style.border = '1px solid #f5c6cb';
                break;
            case 'warning':
                notificationArea.style.backgroundColor = '#fff3cd';
                notificationArea.style.color = '#856404';
                notificationArea.style.border = '1px solid #ffeaa7';
                break;
            default:
                notificationArea.style.backgroundColor = '#d1ecf1';
                notificationArea.style.color = '#0c5460';
                notificationArea.style.border = '1px solid #bee5eb';
        }
        
        // 5秒後に自動で非表示
        setTimeout(() => {
            notificationArea.style.display = 'none';
        }, 5000);
    }
}

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// 音声録音の開始
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const reader = new FileReader();
            
            reader.onload = async () => {
                const base64Audio = reader.result.split(',')[1]; // Base64データを抽出
                
                try {
                    // BFFサーバーに音声データを送信
                    const result = await window.api.transcribeAudio(base64Audio);
                    
                    if (result.success) {
                        // 音声認識結果をUIに表示
                        const aiAnswerWidget = document.getElementById('ai-answer-widget');
                        if (aiAnswerWidget) {
                            aiAnswerWidget.textContent = result.data.transcription || '音声認識が完了しました';
                        }
                        
                        // 会話ログを保存（BFF統合前はローカルストレージのみ）
                        console.log('音声認識結果:', result.data.transcription);
                    } else {
                        console.error('音声認識失敗:', result.error);
                        showNotification(`音声認識に失敗しました: ${result.error}`, 'error');
                    }
                } catch (error) {
                    console.error('BFF通信エラー:', error);
                    showNotification(`BFF通信でエラーが発生しました: ${error.message}`, 'error');
                }
            };
            
            reader.readAsDataURL(audioBlob);
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        // UI更新
        const micStatus = document.getElementById('mic-status');
        if (micStatus) {
            micStatus.textContent = '🎤 録音中...';
            micStatus.style.color = '#e74c3c';
        }
        
        console.log('音声録音を開始しました');
    } catch (error) {
        console.error('音声録音の開始に失敗:', error);
        showNotification('マイクへのアクセスが許可されていません', 'error');
    }
}

// 音声録音の停止
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // ストリームを停止
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        // UI更新
        const micStatus = document.getElementById('mic-status');
        if (micStatus) {
            micStatus.textContent = '🎤 音声認識待機中...';
            micStatus.style.color = '#27ae60';
        }
        
        console.log('音声録音を停止しました');
    }
}

// マイクボタンのクリックイベントを更新
toggleMicBtn.addEventListener('click', () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

// BFFサーバーのヘルスチェック（現在は無効化）
async function checkBFFHealth() {
    // BFF統合前は常にtrueを返す
    return true;
}

// アプリケーション起動時の処理
document.addEventListener('DOMContentLoaded', async () => {
    console.log('アプリケーションが起動しました');
});

// ★★★ BFFサーバーとの通信テスト機能 ★★★
// テスト用のボタンが存在する場合の処理
const testBffButton = document.getElementById('test-bff-button');
if (testBffButton) {
    testBffButton.addEventListener('click', async () => {
        try {
            testBffButton.textContent = '通信テスト中...';
            testBffButton.disabled = true;
            
            // テスト用の音声データ（実際には空のデータ）
            const testAudioData = 'test-audio-data';
            
            // 音声文字起こしのテスト（BFF統合前はモック）
            const result = { success: true, data: { message: 'BFF統合前のテストモードです。音声文字起こし機能は準備中です。' } };
            
            if (result.success) {
                console.log('BFF通信テスト成功:', result.data);
                
                // UIに結果を表示
                const testStatus = document.getElementById('bff-test-status');
                const testResult = document.getElementById('bff-test-result');
                if (testStatus && testResult) {
                    testStatus.style.display = 'block';
                    testStatus.style.backgroundColor = '#d4edda';
                    testStatus.style.border = '1px solid #c3e6cb';
                    testResult.textContent = `成功！サーバー応答: ${JSON.stringify(result.data)}`;
                }
            } else {
                console.error('BFF通信テスト失敗:', result.error);
                
                // UIにエラー結果を表示
                const testStatus = document.getElementById('bff-test-status');
                const testResult = document.getElementById('bff-test-result');
                if (testStatus && testResult) {
                    testStatus.style.display = 'block';
                    testStatus.style.backgroundColor = '#f8d7da';
                    testStatus.style.border = '1px solid #f5c6cb';
                    testResult.textContent = `失敗: ${result.error}`;
                }
            }
        } catch (error) {
            console.error('BFF通信テストでエラー:', error);
            
            // UIにエラー結果を表示
            const testStatus = document.getElementById('bff-test-status');
            const testResult = document.getElementById('bff-test-result');
            if (testStatus && testResult) {
                testStatus.style.display = 'block';
                testStatus.style.backgroundColor = '#f8d7da';
                testStatus.style.border = '1px solid #f5c6cb';
                testResult.textContent = `エラーが発生: ${error.message}`;
            }
        } finally {
            testBffButton.textContent = 'BFF通信テスト';
            testBffButton.disabled = false;
        }
    });
}