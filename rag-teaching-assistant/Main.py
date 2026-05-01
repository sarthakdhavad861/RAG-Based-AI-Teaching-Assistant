"""
Main.py — RAG AI Teaching Assistant API
Upgraded to return RAG sources + video metadata alongside the LLM response
so the React frontend can display them in the Sources panel and VideoPlayer.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from Processing import (
    process_video_to_audio,
    process_audio_to_json,
    add_video_to_embeddings,
    generate_response,
    get_relevant_chunks,          # ← now exported so we can return chunks to UI
)
import shutil, os
from pydantic import BaseModel
import joblib

app = FastAPI(title="RAG AI Teaching Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ───────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "RAG Teaching Assistant API is running!"}


@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename.endswith((".mp4", ".mkv", ".mov")):
        raise HTTPException(400, "Only video files allowed (.mp4, .mkv, .mov)")

    os.makedirs("videos", exist_ok=True)
    video_path = f"videos/{file.filename}"

    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        audio_path = process_video_to_audio(video_path)
        json_path  = process_audio_to_json(audio_path)
        add_video_to_embeddings(json_path)

        total = len(joblib.load("embeddings.joblib")) if os.path.exists("embeddings.joblib") else 0
        return {
            "status":       "success",
            "message":      "Video processed and added to knowledge base!",
            "video":        file.filename,
            "total_chunks": total,
        }
    except Exception as e:
        raise HTTPException(500, f"Processing failed: {str(e)}")


@app.post("/query")
async def ask_question(request: QueryRequest):
    """
    Returns both the LLM response AND the raw RAG chunks so the
    React frontend can populate the Sources panel and VideoPlayer.

    Response shape:
    {
      "response":   "...",           ← LLM answer (already has timestamps in text)
      "sources": [                   ← top-k chunks used as context
        {
          "id":       0,
          "title":    "HTML Basics",
          "number":   "01",
          "start":    12.4,          ← seconds (float) — used for video seek
          "end":      28.1,
          "text":     "In this segment...",
          "score":    0.87           ← cosine similarity score
        },
        ...
      ],
      "video": {                     ← first/most-relevant video for the VideoPlayer
        "title":  "HTML Basics",
        "number": "01",
        "timestamps": [
          { "time": 12, "label": "In this segment..." },
          ...
        ]
      }
    }
    """
    try:
        # Get relevant chunks with similarity scores
        chunks_df = get_relevant_chunks(request.query)

        # Get LLM response (uses same chunks internally)
        response_text = generate_response(request.query)

        # Build sources list for the frontend RAG panel
        sources = []
        if not chunks_df.empty:
            # Re-compute similarities so we can include the score
            from Processing import create_embedding
            import numpy as np
            from sklearn.metrics.pairwise import cosine_similarity as cos_sim

            q_emb = create_embedding([request.query])[0]
            emb_matrix = np.vstack(chunks_df["embedding"].values)
            scores = cos_sim(emb_matrix, [q_emb]).flatten()

            for i, (_, row) in enumerate(chunks_df.iterrows()):
                sources.append({
                    "id":     int(row.get("chunk_id", i)),
                    "title":  str(row.get("Title", "Unknown")),
                    "number": str(row.get("number", "?")),
                    "start":  float(row.get("Start", 0)),
                    "end":    float(row.get("end", 0)),
                    "text":   str(row.get("text", "")),
                    "score":  round(float(scores[i]), 4),
                })

        # Build video metadata from the top source
        video = None
        if sources:
            top = sources[0]
            video = {
                "title":  f"Video {top['number']} — {top['title']}",
                "number": top["number"],
                "timestamps": [
                    {
                        "time":  int(s["start"]),
                        "label": s["text"][:60] + ("…" if len(s["text"]) > 60 else ""),
                    }
                    for s in sources[:5]   # up to 5 clickable timestamps
                ],
            }

        return {
            "response": response_text,
            "sources":  sources,
            "video":    video,
        }

    except Exception as e:
        raise HTTPException(500, f"Error generating response: {str(e)}")
