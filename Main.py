from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from Processing import process_video_to_audio, process_audio_to_json, add_video_to_embeddings, generate_response
import shutil
import os
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

class QueryRequest(BaseModel):
    query: str

@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename.endswith((".mp4", ".mkv", ".mov")):
        raise HTTPException(400, "Only video files allowed (.mp4, .mkv, .mov)")

    video_path = f"videos/{file.filename}"
    
    # Save uploaded file
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Full pipeline (your 3 steps)
        audio_path = process_video_to_audio(video_path)
        json_path = process_audio_to_json(audio_path)
        add_video_to_embeddings(json_path)

        return {
            "status": "success",
            "message": "Video processed and added to knowledge base!",
            "video": file.filename,
            "total_chunks": len(joblib.load('embeddings.joblib')) if os.path.exists('embeddings.joblib') else 0
        }
    except Exception as e:
        raise HTTPException(500, f"Processing failed: {str(e)}")

@app.post("/query")
async def ask_question(request: QueryRequest):
    try:
        response = generate_response(request.query)
        return {"response": response}
    except Exception as e:
        raise HTTPException(500, f"Error generating response: {str(e)}")

@app.get("/")
async def root():
    return {"message": "RAG Teaching Assistant API is running!"}