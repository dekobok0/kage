const express = require('express');
const cors = require('cors');
// SpeechClientのみをインポートします
const { SpeechClient } = require('@google-cloud/speech');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ★★★ 認証情報なしで初期化します！ ★★★
// Cloud Run上で動かすと、--service-accountで指定した権限を自動で使ってくれます。
const speechClient = new SpeechClient();
console.log('Speech-to-Text client initialized using ambient credentials.');

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    // 起動時の非同期初期化は不要になりました
    console.log(`BFF server listening on port ${PORT}`);
});