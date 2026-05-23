from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from openai import AsyncOpenAI
from starlette.responses import StreamingResponse
import hashlib

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

load_dotenv()
Mistal_api_key = os.getenv("MISTRAL_API_KEY")

asyncai = AsyncOpenAI(api_key= Mistal_api_key, base_url="https://api.mistral.ai/v1")

class Article(BaseModel):
    title: str
    full_url: str
    hostname: str
    path_name: str
    textContent: str | None = None
    frameContent: str | None = None

responseCache: dict[str, any] = {}

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/analyze")
async def analyze_article(article: Article):
    url_hash = hashlib.sha256(article.full_url.encode() + (article.frameContent or "").encode()).hexdigest()

    if url_hash in responseCache:
        cached_response = responseCache[url_hash]
        return StreamingResponse(iter([cached_response]), media_type="text/plain")

    openai_response = await asyncai.chat.completions.create(  
        model = "open-mistral-7b",
        messages= [
            {"role": "system", "content": "You are a helpful assistant that analyzes the context of the webpage and provides insightful feedback. Provide the response in a JSON format with the following keys: 'topic' - a short string identifying the main topic, 'subject': the academic category such as Biology, History, Computer Science, 'summary' - A 2 to 3 sentence overview of the page content, 'keyConcepts' - a list of key concepts, 'flashcards' - an array of 5 flashcard objects, each with a front and back. Respond with raw JSON only. No markdown fences. No code blocks. Keep all string values on a single line with no line breaks inside them." },
            {"role": "user", "content": f"Analyze the following article and provide insights:\n\nTitle: {article.title}\nURL: {article.full_url}\nHostname: {article.hostname}\nPath Name: {article.path_name}\nContent: {(article.frameContent or "")[:3000]}"
            }
        ],
        stream = True
    );

    async def generate():
        cachestr = ""
        async for chunk in openai_response:
            if chunk.choices[0].delta.content:
                cachestr += chunk.choices[0].delta.content
                yield chunk.choices[0].delta.content
        
        # Cache the response using a hash of the URL as the key
        responseCache[url_hash] = cachestr
        
    return StreamingResponse(generate(), media_type="text/plain")

