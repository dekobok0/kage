import os
import queue
import sys
import threading
import time
import json


# ★★★ ここから追加 ★★★
# 標準出力と標準エラーの文字コードをUTF-8に強制する
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')
# ★★★ ここまで追加 ★★★

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

# ★★★ listen_print_loop関数を丸ごと置き換える ★★★
def listen_print_loop(responses, openai_client):
    """Googleからのレスポンスを処理し、AIに質問を投げ、AIの応答もストリーミングでElectronに送る"""
    for response in responses:
        if stop_program:
            break
        if not response.results:
            continue
        result = response.results[0]
        if not result.alternatives:
            continue
        transcript = result.alternatives[0].transcript

        # is_finalがTrueの時（発言が確定した時）のみ、AIに質問する
        if result.is_final and len(transcript.strip()) > 10:
            
            # Electronに「あなたの質問」を送信
            q_data = {"type": "user_question", "data": transcript}
            sys.stdout.write(json.dumps(q_data, ensure_ascii=False) + '\n')
            sys.stdout.flush()

            try:
                # Electronに「AIが生成中」であることを送信
                status_data = {"type": "ai_status", "data": "generating"}
                sys.stdout.write(json.dumps(status_data, ensure_ascii=False) + '\n')
                sys.stdout.flush()

                system_prompt = (
                    "あなたは超高速なAI面接アドバイザーです。"
                    "可能な限り迅速に、かつ簡潔に、実践的な回答のヒントを箇条書きで3つ提案してください。"
                )
                
                stream = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": transcript}
                    ],
                    stream=True,
                )
                
                # AIからの回答をチャンク（断片）ごとにElectronに送信
                for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        chunk_data = {"type": "ai_chunk", "data": content}
                        sys.stdout.write(json.dumps(chunk_data, ensure_ascii=False) + '\n')
                        sys.stdout.flush()

                # Electronに「AIの応答が完了」したことを送信
                end_data = {"type": "ai_status", "data": "done"}
                sys.stdout.write(json.dumps(end_data, ensure_ascii=False) + '\n')
                sys.stdout.flush()

            except Exception as e:
                # エラーが発生した場合は、エラー情報をElectronに送信
                error_data = {"type": "error", "data": str(e)}
                sys.stderr.write(json.dumps(error_data, ensure_ascii=False) + '\n')
                sys.stderr.flush()

# ...（main関数などはそのまま）...
# main関数の中にある print("マイクの準備ができました...") のような行は削除してもOKです
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

            # 変更後
            print("マイクの準備ができました。面接官の質問をどうぞ。終了するにはCtrl+Cを押してください。", file=sys.stderr)
            listen_print_loop(responses, openai_client)

    except KeyboardInterrupt:
        print("\nプログラムを終了します。")
        stop_program = True
    except Exception as e:
        print(f"予期せぬエラーが発生しました: {e}")

if __name__ == "__main__":
    main()