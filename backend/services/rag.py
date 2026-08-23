import os
import re
import math
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any
from backend.config import settings

# Paths
REGULATORY_DOCS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "regulatory_docs"
)
CHROMA_DB_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db"
)

# Text-based RAG Fallback System (TF-IDF Vector Space Model)
# Handles SQLite/ChromaDB loading issues gracefully
class LightRAG:
    def __init__(self):
        self.documents = []  # List of dict: {"id": str, "text": str, "source": str}
        self.vocab = {}
        self.idf = {}
        self.doc_vectors = []
        self._load_and_chunk_documents()
        self._build_index()

    def _load_and_chunk_documents(self):
        if not os.path.exists(REGULATORY_DOCS_DIR):
            os.makedirs(REGULATORY_DOCS_DIR, exist_ok=True)
            return

        chunk_id = 0
        for filename in os.listdir(REGULATORY_DOCS_DIR):
            if filename.endswith(".txt"):
                filepath = os.path.join(REGULATORY_DOCS_DIR, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Chunking: split into paragraphs (separated by double newlines)
                paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
                
                for p in paragraphs:
                    self.documents.append({
                        "id": f"chunk_{chunk_id}",
                        "text": p,
                        "source": filename.replace(".txt", "").replace("_", " ").upper()
                    })
                    chunk_id += 1

    def _tokenize(self, text: str) -> List[str]:
        # Lowercase, keep letters, and split
        words = re.findall(r'\b[a-z0-9]+\b', text.lower())
        # Filter basic stop words
        stopwords = {"the", "is", "at", "which", "on", "and", "a", "an", "to", "in", "of", "for", "with", "by"}
        return [w for w in words if w not in stopwords]

    def _build_index(self):
        if not self.documents:
            return

        doc_tfs = []
        df = {}

        # 1. Compute Term Frequencies (TF)
        for doc in self.documents:
            tokens = self._tokenize(doc["text"])
            tf = {}
            for token in tokens:
                tf[token] = tf.get(token, 0) + 1
            doc_tfs.append(tf)

            # Document Frequency (DF)
            for token in set(tokens):
                df[token] = df.get(token, 0) + 1

        # 2. Compute Inverse Document Frequencies (IDF)
        N = len(self.documents)
        for term, val in df.items():
            self.idf[term] = math.log((N + 1) / (val + 1)) + 1

        # 3. Compute Doc Vectors
        for tf in doc_tfs:
            vec = {}
            length = 0.0
            for term, count in tf.items():
                tfidf = count * self.idf[term]
                vec[term] = tfidf
                length += tfidf ** 2
            
            # Normalize vector
            length = math.sqrt(length)
            if length > 0:
                for term in vec:
                    vec[term] /= length
            self.doc_vectors.append((vec, length))

    def retrieve(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        if not self.documents:
            return []

        query_tokens = self._tokenize(query)
        query_tf = {}
        for token in query_tokens:
            query_tf[token] = query_tf.get(token, 0) + 1

        query_vec = {}
        query_len = 0.0
        for term, count in query_tf.items():
            if term in self.idf:
                tfidf = count * self.idf[term]
                query_vec[term] = tfidf
                query_len += tfidf ** 2
        
        query_len = math.sqrt(query_len)
        if query_len > 0:
            for term in query_vec:
                query_vec[term] /= query_len

        # Compute cosine similarity
        scores = []
        for idx, (doc_vec, doc_len) in enumerate(self.doc_vectors):
            if doc_len == 0 or query_len == 0:
                score = 0.0
            else:
                score = sum(query_vec[term] * doc_vec.get(term, 0.0) for term in query_vec if term in doc_vec)
            scores.append((score, self.documents[idx]))

        # Sort by score descending
        scores.sort(key=lambda x: x[0], reverse=True)
        
        # Return top k matches
        matches = []
        for score, doc in scores[:top_k]:
            if score > 0.05:  # threshold
                matches.append({
                    "score": round(score, 3),
                    "text": doc["text"],
                    "source": doc["source"]
                })
        return matches

# ChromaDB Implementation wrapper
class ChromaRAG:
    def __init__(self):
        self.chroma_client = None
        self.collection = None
        self.fallback = LightRAG()  # Initialize fallback
        self.use_fallback = True
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            # If SQLite doesn't meet minimum requirements, chromadb raises an error
            # Wrapping it ensures we fall back to LightRAG smoothly
            self.chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
            self.collection = self.chroma_client.get_or_create_collection(
                name="cpcb_regulations"
            )
            
            # Check if collection is empty, if so populate it
            if self.collection.count() == 0 and self.fallback.documents:
                ids = [doc["id"] for doc in self.fallback.documents]
                documents = [doc["text"] for doc in self.fallback.documents]
                metadatas = [{"source": doc["source"]} for doc in self.fallback.documents]
                
                self.collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
                print(f"ChromaDB initialized and populated with {len(documents)} chunks.")
            self.use_fallback = False
            print("ChromaDB vector store connected successfully.")
        except Exception as e:
            print(f"ChromaDB initialization failed: {e}. Falling back to lightweight TF-IDF RAG.")
            self.use_fallback = True

    def query(self, question: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """
        Query vector database or fallback search.
        """
        if self.use_fallback:
            return self.fallback.retrieve(question, top_k)
            
        try:
            results = self.collection.query(
                query_texts=[question],
                n_results=top_k
            )
            
            formatted = []
            if results and results.get("documents"):
                docs = results["documents"][0]
                metas = results["metadatas"][0]
                distances = results["distances"][0] if "distances" in results else [0.0]*len(docs)
                
                for idx in range(len(docs)):
                    # Distance is typically L2 distance, convert to generic score
                    score = round(1.0 / (1.0 + distances[idx]), 3)
                    formatted.append({
                        "score": score,
                        "text": docs[idx],
                        "source": metas[idx].get("source", "CPCB DOCUMENT")
                    })
            return formatted
        except Exception as e:
            print(f"Error querying ChromaDB: {e}. Trying fallback retrieve.")
            return self.fallback.retrieve(question, top_k)

rag_service = ChromaRAG()

# ─── helpers ────────────────────────────────────────────────────────────────

from backend.models.database import db_helper

_CITY_PATTERN = re.compile(
    r"\b(delhi|mumbai|bengaluru|kolkata|chennai|hyderabad|lucknow|jabalpur|pune|ahmedabad)\b",
    re.IGNORECASE,
)
_TREND_KEYWORDS = {"grow", "grew", "reduc", "trend", "last few", "days", "week", 
                    "yesterday", "history", "change", "worse", "better", "improv"}

async def _fetch_live_aqi_summary(question: str) -> str:
    """
    Fetches live or historical AQI summary from MongoDB for injection into the LLM prompt.
    Detects whether the question is about current conditions OR historical trend.
    """
    LIVE_KEYWORDS = {"aqi", "average", "pollution", "air quality", "pm2", "pm10", "no2",
                     "so2", "co", "o3", "index", "level", "concentration", "grow", "reduc",
                     "trend", "days", "week", "history", "change", "worse", "better",
                     "weather", "temperature", "humidity", "wind", "temp", "hot", "cool"}
    q_lower = question.lower()
    if not any(kw in q_lower for kw in LIVE_KEYWORDS):
        return ""

    city_match = _CITY_PATTERN.search(question)
    if not city_match:
        return ""
    city = city_match.group(0).lower()
    is_trend = any(kw in q_lower for kw in _TREND_KEYWORDS)

    try:
        if db_helper.stations is None:
            db_helper.connect()
        stations = await db_helper.stations.find({"city": city, "active": True}).to_list(50)
        if not stations:
            return ""
        station_ids = [s["station_id"] for s in stations]

        if is_trend:
            # Historical daily averages for the past 7 days
            now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
            days_back = 7
            daily_avgs = []
            for d in range(days_back, -1, -1):
                day_start = now - timedelta(days=d, hours=now.hour)
                day_end   = day_start + timedelta(days=1)
                cursor = db_helper.aqi_readings.find({
                    "station_id": {"$in": station_ids},
                    "timestamp": {"$gte": day_start, "$lt": day_end}
                })
                day_readings = await cursor.to_list(2000)
                if day_readings:
                    avg = round(sum(r["aqi"] for r in day_readings) / len(day_readings))
                    daily_avgs.append((day_start.strftime("%d %b"), avg, len(day_readings)))

            if not daily_avgs:
                return ""

            lines = [f"HISTORICAL TREND — {city.title()} Daily Average AQI (last {days_back} days):"]
            for label, avg, count in daily_avgs:
                bar = "█" * min(20, avg // 25)
                lines.append(f"  {label}: AQI {avg:>3}  {bar}  ({count} readings)")

            if len(daily_avgs) >= 2:
                delta = daily_avgs[-1][1] - daily_avgs[0][1]
                direction = "WORSENED" if delta > 0 else "IMPROVED"
                lines.append(f"Trend: AQI {direction} by {abs(delta)} points over {days_back} days.")
            return "\n".join(lines)

        else:
            # Current snapshot
            readings = []
            for s in stations:
                r = await db_helper.aqi_readings.find_one(
                    {"station_id": s["station_id"]}, sort=[("timestamp", -1)]
                )
                if r:
                    readings.append(r)

            if not readings:
                return ""

            avg_aqi  = round(sum(r["aqi"]  for r in readings) / len(readings))
            avg_pm25 = round(sum(r.get("pm25", 0) for r in readings) / len(readings), 1)
            avg_pm10 = round(sum(r.get("pm10", 0) for r in readings) / len(readings), 1)
            max_aqi  = max(r["aqi"] for r in readings)
            min_aqi  = min(r["aqi"] for r in readings)
            sources  = list({r.get("source", "?") for r in readings})
            ts       = readings[0].get("timestamp")
            ts_str   = ts.strftime("%d %b %Y, %H:%M UTC") if ts else "recent"
            # Weather from most recent reading
            sample   = readings[0]
            avg_temp = round(sum(r.get("temperature", 0) for r in readings) / len(readings), 1)
            avg_hum  = round(sum(r.get("humidity", 0) for r in readings) / len(readings), 1)
            avg_wind = round(sum(r.get("wind_speed", 0) for r in readings) / len(readings), 1)

            lines = [
                f"{city.title()} snapshot ({ts_str}):",
                f"AQI avg {avg_aqi} (min {min_aqi}, max {max_aqi})",
                f"PM2.5 {avg_pm25} µg/m³, PM10 {avg_pm10} µg/m³",
                f"Temp {avg_temp}°C, Humidity {avg_hum}%, Wind {avg_wind} km/h",
            ]
            readings.sort(key=lambda r: r["aqi"], reverse=True)
            for r in readings[:2]:
                s_name = next((s["name"] for s in stations if s["station_id"] == r["station_id"]), r["station_id"])
                lines.append(f"Worst: {s_name} AQI {r['aqi']}")
            # Hard-cap the summary itself at 400 chars
            return "\n".join(lines)[:400]
    except Exception:
        return ""


# Main AI response generation function
async def generate_rag_response(question: str) -> Dict[str, Any]:
    """
    Search the vector DB for context and answer via Groq — cached-first so the
    demo never stalls on a rate limit, with conversational and deterministic fallbacks.
    """
    from backend.services.llm_cache import llm_cache

    # 1. Retrieve matching regulatory chunks — top_k=1, tightly capped
    contexts = rag_service.query(question, top_k=1)
    has_context = bool(contexts)

    if has_context:
        # Cap each chunk at 150 chars, total at 400 chars
        context_text = contexts[0]["text"][:300]
        sources = [contexts[0]["source"]]
    else:
        context_text = ""
        sources = ["CPCB & NCAP Policy Framework"]

    # 2. Fetch live DB data if question is about city AQI
    live_summary = await _fetch_live_aqi_summary(question)

    # 3. Cached-first Groq answer
    async def _call_groq():
        import groq as groq_sdk
        client = groq_sdk.AsyncGroq(api_key=settings.GROQ_API_KEY)

        # Build prompt in strict budget: sys(120) + q(150) + data(350) + ctx(300) = ~920 chars max
        SYS = "You are VayuDrishti, an Indian air quality AI. Answer in 3-4 sentences. Decline off-topic questions politely."
        q_part   = question[:150]
        data_part = live_summary[:350] if live_summary else ""
        ctx_part  = context_text[:300] if has_context else ""

        parts = [SYS, f"Q: {q_part}"]
        if data_part:
            parts.append(f"Data:\n{data_part}")
        if ctx_part:
            parts.append(f"Context:\n{ctx_part}")
        prompt = "\n\n".join(parts)

        # Safety net: if still oversized, drop context then data
        if len(prompt) > 1200:
            prompt = f"{SYS}\n\nQ: {q_part}\n\n{data_part[:400]}"
        if len(prompt) > 900:
            prompt = f"{SYS}\n\nQ: {q_part}"

        print(f"[RAG] prompt={len(prompt)} chars")

        response = await client.chat.completions.create(
            model="groq/compound",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=400,
        )
        answer_text = response.choices[0].message.content.strip()
        res_sources = sources if live_summary else sources
        if "I specialize exclusively" in answer_text or "cannot assist with" in answer_text:
            res_sources = []
        return {"answer": answer_text, "sources": res_sources}

    if settings.GROQ_API_KEY:
        try:
            cached = await llm_cache.get_or_generate(
                "rag_chat_groq", {"q": question.strip().lower(), "src": sorted(sources)}, _call_groq
            )
            if cached["result"]:
                return {
                    **cached["result"],
                    "provenance": cached["source"],
                    "cached_at": cached.get("cached_at"),
                }
        except Exception as e:
            print(f"Error calling Groq in RAG: {e}. Using snippet fallback.")

    # 4. Deterministic fallback — prefer live data if available
    if live_summary:
        return {
            "answer": live_summary,
            "sources": ["Live MongoDB readings"],
            "provenance": "live-db-fallback",
        }
    if has_context:
        best_match = contexts[0]
        return {
            "answer": f"According to the {best_match['source']} guidelines:\n\n{best_match['text']}",
            "sources": sources,
            "provenance": "retrieval-only",
        }
    return {
        "answer": "Hello! I am VayuDrishti's Air Quality & Regulatory Assistant. Ask me about CPCB NAAQS standards, GRAP emergency measures, NCAP targets, or health precautions during high pollution episodes.",
        "sources": ["CPCB Guidelines"],
        "provenance": "template",
    }


