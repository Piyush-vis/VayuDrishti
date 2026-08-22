import os
import re
import math
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

# Main AI response generation function
async def generate_rag_response(question: str) -> Dict[str, Any]:
    """
    Search the vector DB for context and answer via Groq — cached-first so the
    demo never stalls on a rate limit, with conversational and deterministic fallbacks.
    """
    from backend.services.llm_cache import llm_cache

    # 1. Retrieve matching chunks
    contexts = rag_service.query(question, top_k=4)
    has_context = bool(contexts)

    if has_context:
        context_text = "\n\n".join([f"SOURCE: {c['source']}\n{c['text']}" for c in contexts])
        sources = list(set([c["source"] for c in contexts]))
    else:
        context_text = ""
        sources = ["CPCB & NCAP Policy Framework"]

    # 2. Cached-first Groq answer. Cache key = question + retrieved source set,
    # so an identical question never re-spends quota.
    async def _call_groq():
        import groq as groq_sdk
        client = groq_sdk.AsyncGroq(api_key=settings.GROQ_API_KEY)
        
        if has_context:
            prompt = f"""You are VayuDrishti's AI Air Quality & Regulatory Assistant. Answer questions about Indian air quality policies, CPCB standards, and NCAP using the provided regulatory context.

CRITICAL GUARDRAIL: You specialize EXCLUSIVELY in Indian air quality intelligence, environmental regulations, CPCB/NAAQS standards, NCAP targets, and smog health precautions.
- If the user asks an off-topic question (such as general coding, Python/programming, math puzzles, recipes, or unrelated topics), you MUST decline immediately in 1-2 polite sentences: "I specialize exclusively in air quality intelligence, CPCB regulations, and environmental health. I cannot assist with programming or unrelated topics. Please feel free to ask about air quality standards, GRAP stages, or pollution guidelines."
- NEVER write code or answer off-topic queries, and NEVER cite regulatory documents for off-topic requests.
- For valid air quality questions, answer accurately based on the context and cite the relevant source document (e.g. NCAP GUIDELINES or NAAQS STANDARDS). Keep it concise (3-4 sentences).

User Question: {question}

Regulatory Context:
{context_text}"""
        else:
            prompt = f"""You are VayuDrishti's AI Air Quality & Regulatory Assistant.

CRITICAL GUARDRAIL: You specialize EXCLUSIVELY in Indian air quality intelligence, environmental regulations, CPCB/NAAQS standards, NCAP targets, and smog health precautions.

User message: {question}

Instructions:
- If the user is greeting you ('hello', 'hi', 'hey', etc.), greet them warmly, introduce yourself as VayuDrishti's Air Quality & Regulatory Intelligence Assistant, and suggest 2-3 specific air quality topics (e.g. CPCB NAAQS limits, GRAP emergency stages, NCAP reduction targets, or health precautions during smog).
- If the user asks an air quality, pollution health risk, or policy question, provide an accurate, concise, and helpful explanation (3-4 sentences).
- If the user asks an off-topic question (such as general coding, programming, math puzzles, recipes, or unrelated subjects), decline politely in 1-2 sentences: "I specialize exclusively in air quality intelligence, CPCB regulations, and environmental health. I cannot assist with programming or unrelated topics. Please feel free to ask about air quality standards, GRAP stages, or pollution guidelines." Do NOT answer off-topic queries."""

        response = await client.chat.completions.create(
            model="groq/compound",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=512,
        )
        answer_text = response.choices[0].message.content.strip()
        # If the assistant declined an off-topic request, don't return regulatory sources
        res_sources = sources
        if "I specialize exclusively in" in answer_text or "cannot assist with" in answer_text:
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
                    "provenance": cached["source"],   # cached | live
                    "cached_at": cached.get("cached_at"),
                }
        except Exception as e:
            print(f"Error calling Groq in RAG: {e}. Using snippet fallback.")

    # 3. Deterministic fallback
    if has_context:
        best_match = contexts[0]
        return {
            "answer": f"According to the {best_match['source']} guidelines:\n\n{best_match['text']}",
            "sources": sources,
            "provenance": "retrieval-only",
        }
    else:
        return {
            "answer": "Hello! I am VayuDrishti's Air Quality & Regulatory Assistant. You can ask me about CPCB NAAQS standards, GRAP emergency measures, NCAP targets, or health precautions during high pollution episodes.",
            "sources": ["CPCB Guidelines"],
            "provenance": "template",
        }
