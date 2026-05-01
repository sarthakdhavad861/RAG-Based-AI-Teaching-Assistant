import os
import subprocess
import json
import whisper
import pandas as pd
import requests
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import joblib
from typing import List, Dict

# Create folders if they don't exist
os.makedirs("videos", exist_ok=True)
os.makedirs("audios", exist_ok=True)
os.makedirs("jsons", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

MODEL = whisper.load_model("small")

def process_video_to_audio(video_path: str) -> str:
    """Step 1: Video → MP3"""
    filename = os.path.basename(video_path)
    parts = filename.split("_-_")
    if len(parts) < 2:
        file_name = filename.replace(".mp4", "").replace(".mkv", "")
        tutorial_number = "unknown"
    else:
        file_name = parts[0].strip()
        tutorial_part = parts[1].split("_")
        tutorial_number = tutorial_part[1] if len(tutorial_part) > 1 else "unknown"

    audio_path = f"audios/{tutorial_number}_{file_name}.mp3"
    
    subprocess.run([
        "ffmpeg", "-i", video_path,
        "-q:a", "0", "-map", "a", audio_path
    ], check=True, capture_output=True)
    
    return audio_path

def process_audio_to_json(audio_path: str) -> str:
    """Step 2: Audio → JSON chunks (Whisper + translate)"""
    audio_name = os.path.basename(audio_path)
    if "_" not in audio_name:
        return None
    number = audio_name.split("_")[0]
    title = audio_name.split("_")[1][:-4]

    result = MODEL.transcribe(
        audio=audio_path,
        language="hi",
        task="translate",
        word_timestamps=True
    )

    chunks = []
    for segment in result['segments']:
        chunks.append({
            "number": number,
            "Title": title,
            "Start": segment['start'],
            "end": segment['end'],
            "text": segment['text']
        })

    data = {'chunks': chunks, "text": result['text']}
    json_path = f"jsons/{audio_name}.json"
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    return json_path

def create_embedding(text_list: List[str]):
    r = requests.post("http://localhost:11434/api/embed", json={
        "model": "bge-m3",
        "input": text_list
    })
    return r.json()['embeddings']

def add_video_to_embeddings(json_path: str):
    """Step 3: Add new video chunks to embeddings.joblib"""
    with open(json_path, encoding='utf-8') as f:
        content = json.load(f)

    # Load existing embeddings (or create new)
    if os.path.exists('embeddings.joblib'):
        df = joblib.load('embeddings.joblib')
    else:
        df = pd.DataFrame()

    print(f"Creating embeddings for {os.path.basename(json_path)}")
    embeddings = create_embedding([c['text'] for c in content['chunks']])

    new_rows = []
    for i, chunk in enumerate(content['chunks']):
        chunk['chunk_id'] = len(df) + len(new_rows)
        chunk['embedding'] = embeddings[i]
        new_rows.append(chunk)

    new_df = pd.DataFrame.from_records(new_rows)
    df = pd.concat([df, new_df], ignore_index=True)
    
    joblib.dump(df, 'embeddings.joblib')
    print(f"Embeddings updated! Total chunks: {len(df)}")

# ====================== QUERY LOGIC ======================
def get_relevant_chunks(query: str, top_k: int = 6, threshold: float = 0.25):
    if not os.path.exists('embeddings.joblib'):
        return pd.DataFrame()
    
    df = joblib.load('embeddings.joblib')
    question_embedding = create_embedding([query])[0]

    embeddings_matrix = np.vstack(df['embedding'].values)
    similarities = cosine_similarity(embeddings_matrix, [question_embedding]).flatten()

    max_indx = similarities.argsort()[::-1][:top_k]
    new_df = df.iloc[max_indx].copy()

    if similarities[max_indx[0]] < threshold:
        return pd.DataFrame()  # no relevant results

    return new_df

def generate_response(query: str) -> str:
    new_df = get_relevant_chunks(query)
    
    if new_df.empty:
        return "I can only answer questions related to the web development video tutorials I have."

    context_json = new_df[["Title", "number", "Start", "end", "text"]].to_json(orient="records", indent=2)

    prompt = f"""You are an expert web development teaching assistant.
Here are the most relevant subtitle chunks from the videos:

{context_json}

User question: "{query}"

Answer in a friendly, natural, human way.
Always mention:
- Which video (title + number)
- The exact timestamp (in MM:SS format if possible)
- Guide the user: "Go to video number X titled '...' and watch from XX:XX"

Only use the provided context."""

    r = requests.post("http://localhost:11434/api/generate", json={
        "model": "llama3.1",
        "prompt": prompt,
        "stream": False,
        "temperature": 0.7,
    })
    return r.json()["response"]