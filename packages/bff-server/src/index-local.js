const express = require('express');
const cors = require('cors');
const { SpeechClient } = require('@google-cloud/speech');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Base64音声データのためにリクエストサイズ上限を上げる

let speechClient;

// ローカルファイルからGCPキーを読み込み、SpeechClientを初期化する関数
function initializeGoogleCloudLocal() {
    try {
        // ローカルのGCP認証キーファイルのパス
        const keyPath = path.join(__dirname, '..', '..', 'electron-app', 'python_assets', 'kage-gcp-key.json');
        
        if (!fs.existsSync(keyPath)) {
            console.error('GCP認証キーファイルが見つかりません:', keyPath);
            console.log('ローカルテスト用のモックモードで起動します。');
            return false;
        }
        
        const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        speechClient = new SpeechClient({ credentials });
        console.log('Speech-to-Text client initialized successfully from local file.');
        return true;
    } catch (error) {
        console.error('Failed to initialize Google Cloud client from local file:', error);
        console.log('ローカルテスト用のモックモードで起動します。');
        return false;
    }
}

// 文字起こしAPIエンドポイント
app.post('/api/transcribe', async (req, res) => {
    console.log('=== BFFサーバー: クライアントからリクエストを受け取りました ===');
    console.log('リクエストボディ:', req.body);
    
    if (!speechClient) {
        // モックモード：テスト用の応答を返す
        console.log('モックモード: テスト用の応答を返します');
        const mockResponse = {
            success: true,
            transcription: '（モックモード）これはテスト用の文字起こし結果です。',
            timestamp: new Date().toISOString(),
            mode: 'mock'
        };
        console.log('モックレスポンス:', mockResponse);
        return res.json(mockResponse);
    }

    try {
        const audioBytes = req.body.audioContent; // Electronから送られてくるBase64文字列
        if (!audioBytes) {
            return res.status(400).json({ error: 'audioContent is missing' });
        }

        const audio = {
            content: audioBytes,
        };
        const config = {
            encoding: 'WEBM_OPUS', // renderer.jsのMediaRecorderの形式に合わせる
            sampleRateHertz: 48000,
            languageCode: 'ja-JP',
            enableAutomaticPunctuation: true,
        };
        const request = {
            audio: audio,
            config: config,
        };

        const [response] = await speechClient.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        
        console.log(`Transcription: ${transcription}`);
        res.json({ 
            success: true, 
            transcription: transcription,
            mode: 'gcp',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error during transcription:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ヘルスチェック用エンドポイント
app.get('/', (req, res) => {
    res.json({
        message: 'Kage BFFサーバーは正常に動作しています！',
        mode: speechClient ? 'gcp' : 'mock',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 8080;

// サーバー起動
app.listen(PORT, () => {
    console.log(`BFF server listening on port ${PORT}`);
    console.log('GCP認証情報の初期化を試行中...');
    
    const gcpInitialized = initializeGoogleCloudLocal();
    if (gcpInitialized) {
        console.log('✅ GCP Speech-to-Text APIが利用可能です');
    } else {
        console.log('⚠️  モックモードで動作します（GCP APIは利用不可）');
    }
});
