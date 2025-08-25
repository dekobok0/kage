const express = require('express');
const cors = require('cors');
// SpeechClientのみをインポートします
const { SpeechClient } = require('@google-cloud/speech');
// Stripeの初期化を追加
const Stripe = require('stripe');
const config = require('../config.js');
const https = require('https'); // カスタムHTTPSエージェント用
const { v4: uuidv4 } = require('uuid'); // 冪等性キー生成用

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// レポートで推奨されているカスタムHTTPSエージェントのインスタンスを作成
const httpsAgent = new https.Agent({
  // 接続の再利用を有効にする
  keepAlive: true,

  // アイドル状態の接続を60秒間維持する
  // これにより、中間デバイスに勝手に切断される前に接続を管理できる
  keepAliveMsecs: 60000,

  // 同時に開くことができる接続の最大数
  maxSockets: 100,

  // プールに保持するアイドル状態の接続の最大数
  maxFreeSockets: 10,

  // 接続が60秒間完全に非アクティブだった場合にタイムアウトさせる
  timeout: 60000
});

// ★★★ 認証情報なしで初期化します！ ★★★
// Cloud Run上で動かすと、--service-accountで指定した権限を自動で使ってくれます。
const speechClient = new SpeechClient();
console.log('Speech-to-Text client initialized using ambient credentials.');

// Stripeの初期化（カスタムエージェントと自動リトライを適用）
const stripe = new Stripe(config.stripe.secretKey, {
  httpAgent: httpsAgent,        // 作成したカスタムエージェントを指定
  maxNetworkRetries: 2           // ネットワークエラー時に最大2回自動で再試行する
});
console.log('Stripe client initialized successfully with custom HTTPS agent and retry logic.');

// 文字起こしAPIエンドポイント
app.post('/api/transcribe', async (req, res) => {
    try {
        const audioBytes = req.body.audioContent;
        if (!audioBytes) {
            return res.status(400).json({ error: 'audioContent is missing' });
        }

        const audio = { content: audioBytes };
        const config = {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'ja-JP',
            enableAutomaticPunctuation: true,
        };
        const request = { audio, config };

        const [response] = await speechClient.recognize(request);
        const transcription = response.results
           .map(result => result.alternatives.transcript)
           .join('\n');
        
        console.log(`Transcription: ${transcription}`);
        res.json({ success: true, transcription: transcription });

    } catch (error) {
        console.error('Error during transcription:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Stripe決済セッション作成用のAPIエンドポイント
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { priceId } = req.body;
        const finalPriceId = priceId || config.stripeDefaults.defaultPriceId;
        
        if (!finalPriceId) {
            return res.status(400).json({ error: 'priceId is missing' });
        }
        
        // リクエストごとにユニークな冪等性キーを生成
        const idempotencyKey = uuidv4();

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: finalPriceId, quantity: 1 }],
            mode: 'subscription',
            success_url: config.stripeDefaults.successUrl,
            cancel_url: config.stripeDefaults.cancelUrl,
        }, {
            idempotencyKey: idempotencyKey // 生成したキーを渡す
        });
        
        console.log(`Stripe session created successfully for price: ${finalPriceId} with idempotency key: ${idempotencyKey}`);
        res.json({ success: true, url: session.url });
    } catch (error) {
        console.error('Error creating Stripe session:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = config.server.port;
app.listen(PORT, () => {
    // 起動時の非同期初期化は不要になりました
    console.log(`BFF server listening on port ${PORT}`);
    console.log(`Environment: ${config.environment}`);
});