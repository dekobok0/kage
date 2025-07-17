# step_final.py (パーソナライズ機能追加版)
import os
import queue
import sys
import threading
import time
import json

# 標準出力と標準エラーの文字コードをUTF-8に強制する
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

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
user_profile = {} # ★★★ プロフィール情報をここに保存します ★★★


# ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
# ★★★ ここからが今回の修正の核心です ★★★
# ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

def load_profile():
    """
    Node.jsから送られてくる最初の1行を読み込み、プロフィール情報をグローバル変数にセットする。
    """
    global user_profile
    try:
        profile_line = sys.stdin.readline()
        profile_data = json.loads(profile_line)
        user_profile = {
            "characteristics": profile_data.get("characteristics", ""),
            "resume": profile_data.get("resume", "")
        }
        # デバッグ用にファイルに書き出しておくと、正しく受け取れたか確認できて便利です
        with open("profile_log.txt", "w", encoding="utf-8") as f:
            f.write(f"ロードされたプロフィール:\n{json.dumps(user_profile, indent=2, ensure_ascii=False)}")
    except Exception as e:
        user_profile = {"characteristics": "", "resume": ""}
        with open("profile_log.txt", "w", encoding="utf-8") as f:
            f.write(f"プロフィールの読み込みに失敗しました: {e}\n")

def create_personalized_prompt(question):
    """
    プロフィール情報と面接官の質問を組み合わせて、AIへの指示（プロンプト）を作成する。
    """
    global user_profile
    
    characteristics = user_profile.get("characteristics", "特になし")
    resume = user_profile.get("resume", "経歴情報なし")

    system_prompt = f"""あなたは、面接を受けるユーザーをリアルタイムで支援する、優秀なAIアシスタント「Kage」です。
ユーザーのプロフィールは以下の通りです。この情報を最大限に活用し、ユーザーが自信を持って面接に臨めるよう、具体的で的確なアドバイスを生成してください。

# ユーザーの特性・配慮してほしい点
{characteristics}

# ユーザーの経歴・スキル
{resume}

---
ルール:
- 上記のプロフィールを「あなた自身」のこととして回答を生成してください。
- ユーザーが面接でそのまま話せるような、自然で簡潔な文章を考えてください。
- 決して「あなたの経歴書によると〜」のような、他人行儀な前置きはしないでください。
"""
    
    user_prompt = f"面接官からの質問は「{question}」です。プロフィール情報を踏まえて、あなたが話すべき内容を提案してください。"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    return messages

# ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
# ★★★ ここまでが修正の核心です ★★★
# ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★


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

        if result.is_final and len(transcript.strip()) > 10:
            
            q_data = {"type": "user_question", "data": transcript}
            sys.stdout.write(json.dumps(q_data, ensure_ascii=False) + '\n')
            sys.stdout.flush()

            try:
                status_data = {"type": "ai_status", "data": "generating"}
                sys.stdout.write(json.dumps(status_data, ensure_ascii=False) + '\n')
                sys.stdout.flush()

                # ★★★ プロンプト作成部分を修正 ★★★
                messages = create_personalized_prompt(transcript)
                
                stream = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages, # ★★★ 修正後のmessages変数を使う ★★★
                    stream=True,
                )
                
                for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        chunk_data = {"type": "ai_chunk", "data": content}
                        sys.stdout.write(json.dumps(chunk_data, ensure_ascii=False) + '\n')
                        sys.stdout.flush()

                end_data = {"type": "ai_status", "data": "done"}
                sys.stdout.write(json.dumps(end_data, ensure_ascii=False) + '\n')
                sys.stdout.flush()

            except Exception as e:
                error_data = {"type": "error", "data": str(e)}
                sys.stderr.write(json.dumps(error_data, ensure_ascii=False) + '\n')
                sys.stderr.flush()


def main():
    global stop_program
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        send_to_node("error", "OpenAIのAPIキーが設定されていません。")
        return
        
    speech_client = speech.SpeechClient()
    openai_client = OpenAI(api_key=api_key)

    # ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    # ★★★ 最初に必ずプロフィールを読み込む ★★★
    load_profile()
    # ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

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

            send_to_node("system_message", "マイクの準備ができました。面接官の質問をどうぞ。")
            listen_print_loop(responses, openai_client)

    except KeyboardInterrupt:
        send_to_node("system_message", "プログラムを終了します。")
        stop_program = True
    except Exception as e:
        send_to_node("error", f"予期せぬエラーが発生しました: {e}")

# send_to_node関数をmainの外に定義
def send_to_node(data_type, data):
    """Node.jsにJSON形式でデータを送信するヘルパー関数"""
    message = json.dumps({"type": data_type, "data": data})
    print(message, flush=True)

if __name__ == "__main__":
    main()