// src/main/reportService.js
// PDF作成とStripe決済のロジックを集約

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const Stripe = require('stripe');
const log = require('electron-log');

class ReportService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    log.info('[Report] ReportService initialized');
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

  /**
   * レポートのHTMLを生成
   * @param {Object} reportData - レポート生成に必要なデータ
   * @returns {string} HTML文字列
   */
  generateReportHTML(reportData) {
    const { startTime, endTime, hintCount, conversationLog, profile } = reportData;
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

  /**
   * Stripe Checkoutセッションを作成
   * @returns {Promise<Object>} セッション作成結果
   */
  async createCheckoutSession() {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          { price: 'price_1RmYiIRhh0YbRyvV9bJG7N3v', quantity: 1 },
        ],
        mode: 'subscription',
        success_url: 'https://effulgent-marzipan-17f896.netlify.app/success.html',
        cancel_url: 'https://effulgent-marzipan-17f896.netlify.app/cancel.html',
      });
      
      log.info('[Report] Stripe Checkout session created successfully');
      return { success: true, url: session.url };
    } catch (error) {
      log.error('[Report] Failed to create Stripe Checkout session:', error);
      throw new Error(`決済ページの作成に失敗しました: ${error.message}`);
    }
  }
}

module.exports = ReportService;
