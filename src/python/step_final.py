import os
import queue
import sys
import threading
import time

from google.cloud import speech
from openai import OpenAI
from dotenv import load_dotenv
import sounddevice as sd

# --- 設定 ---
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "kage-gcp-key.json"
SAMPLE_RATE = 16000
CHUNK_SIZE = int(SAMPLE_RATE / 10)  # 100ms

# --- グローバル変数 ---
audio_buffer = queue.Queue()
stop_program = False

class MicrophoneStream:
    """マイクからの音声ストリームを管理するクラス"""
    def __init__(self, rate, chunk):
        self._rate = rate
        self._chunk = chunk
        self._audio_stream = None

    def __enter__(self):
        self._audio_stream = sd.RawInputStream(
            samplerate=self._rate,
            blocksize=self._chunk,
            device=None,
            channels=1,
            dtype="int16",
            callback=self._fill_buffer,
        )
        self._audio_stream.start()
        return self

    def __exit__(self, type, value, traceback):
        self._audio_stream.stop()
        self._audio_stream.close()

    def _fill_buffer(self, indata, frames, time, status):
        if status:
            print(status, file=sys.stderr)
        audio_buffer.put(bytes(indata))

    def generator(self):
        while not stop_program:
            chunk = audio_buffer.get()
            if chunk is None:
                return
            yield speech.StreamingRecognizeRequest(audio_content=chunk)

def listen_print_loop(responses, openai_client):
    """Googleからのレスポンスを処理し、AIに質問を投げ、AIの応答もストリーミングで表示する"""
    for response in responses:
        if stop_program:
            break
        if not response.results:
            continue
        result = response.results[0]
        if not result.alternatives:
            continue
        transcript = result.alternatives[0].transcript

        sys.stdout.write(f"\r認識中: {transcript}")
        sys.stdout.flush()

        # ★★★ ここが修正されたロジック ★★★
        # 発言が確定し、かつ空白を除いた文字数が10文字より多い場合のみ、中の処理を実行する
        if result.is_final and len(transcript.strip()) > 10:
            sys.stdout.write('\n')
            print(f"あなたの質問: 「{transcript}」")
            
            # 最初のトークンが返ってくるまでの時間を計測
            first_token_time = None
            
            # try...exceptブロック全体をif文の内側に移動
            try:
                print("AIが回答を生成中...")
                system_prompt = (
                    "あなたは超高速なAI面接アドバイザーです。"
                    "可能な限り迅速に、かつ簡潔に、実践的な回答のヒントを箇条書きで3つ提案してください。"
                )
                
                start_time = time.time()
                
                stream = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": transcript}
                    ],
                    temperature=0.7,
                    max_tokens=500,
                    stream=True, 
                )
                
                print("\n-------------------- AIからの回答 --------------------")
                for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        if first_token_time is None:
                            first_token_time = time.time()
                        
                        sys.stdout.write(content)
                        sys.stdout.flush()

                print("\n----------------------------------------------------")
                
                if first_token_time:
                    elapsed_time = first_token_time - start_time
                    print(f"\n【検証結果】初回応答速度: {elapsed_time:.2f} 秒")
                    if elapsed_time <= 1.5:
                        print("🎉 目標達成！超高速なリアルタイム応答です！")
                    else:
                        print("初回応答速度は良好です。")
                
                print("\n次の質問をどうぞ...")

            except Exception as e:
                print(f"OpenAI APIでエラーが発生しました: {e}")

def main():
    global stop_program
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("エラー: OpenAIのAPIキーが設定されていません。")
        return
        
    speech_client = speech.SpeechClient()
    openai_client = OpenAI(api_key=api_key)

    streaming_config = speech.StreamingRecognitionConfig(
        config=speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=SAMPLE_RATE,
            language_code="ja-JP",
        ),
        interim_results=True,
    )

    try:
        with MicrophoneStream(SAMPLE_RATE, CHUNK_SIZE) as stream:
            audio_generator = stream.generator()
            requests = (req for req in audio_generator)

            responses = speech_client.streaming_recognize(
                config=streaming_config,
                requests=requests
            )

            print("マイクの準備ができました。面接官の質問をどうぞ。終了するにはCtrl+Cを押してください。")
            listen_print_loop(responses, openai_client)

    except KeyboardInterrupt:
        print("\nプログラムを終了します。")
        stop_program = True
    except Exception as e:
        print(f"予期せぬエラーが発生しました: {e}")

if __name__ == "__main__":
    main()