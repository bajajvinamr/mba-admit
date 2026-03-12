import os
import json
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Only import heavy/LLM libraries after validating API keys
from llama_index.core import Document, VectorStoreIndex, StorageContext
from llama_index.core.settings import Settings
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

# Data Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
ESSAYS_FILE = os.path.join(DATA_DIR, "scraped_essays.json")
DB_PATH = os.path.join(DATA_DIR, "qdrant_db")

def load_essays():
    """Load scraped essays from JSON file."""
    if not os.path.exists(ESSAYS_FILE):
        print(f"❌ ERROR: Extracted data not found at {ESSAYS_FILE}")
        return []

    with open(ESSAYS_FILE, "r") as f:
        data = json.load(f)
    print(f"✅ Loaded {len(data)} essays from storage.")
    return data

def build_llama_index_documents(essays):
    """Convert raw JSON dictionaries into LlamaIndex Document objects."""
    docs = []
    for essay in essays:
        school_str = essay.get('school_name', essay.get('school_id', 'Unknown'))
        text_content = f"School: {school_str}\n"
        text_content += f"Prompt: {essay.get('essay_prompt', 'Unknown')}\n"
        text_content += f"Industry: {essay.get('applicant_profile', {}).get('industry', 'Unknown')}\n"
        text_content += f"GMAT: {essay.get('applicant_profile', {}).get('gmat', 'Unknown')}\n"
        text_content += f"GPA: {essay.get('applicant_profile', {}).get('gpa', 'Unknown')}\n"
        text_content += f"\n--- ESSAY ---\n{essay['essay_text']}"
        
        metadata = {
            "school_id": essay["school_id"],
            "industry": essay.get("applicant_profile", {}).get("industry", "Unknown"),
            "gmat": essay.get("applicant_profile", {}).get("gmat", 0),
            "source": essay["source"]
        }
        
        doc = Document(text=text_content, metadata=metadata)
        docs.append(doc)
    
    print(f"✅ Created {len(docs)} LlamaIndex Document objects.")
    return docs

def ingest_to_qdrant(documents):
    """Embed documents using Local HuggingFace embeddings and store them in Qdrant Vector DB."""
    print("🚀 Initializing Qdrant Client (local)...")
    client = QdrantClient(path=DB_PATH)
    collection_name = "mba_essays"
    
    # BAAI/bge-small-en-v1.5 uses 384 dimensions
    if not client.collection_exists(collection_name):
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
        print(f"✅ Created Qdrant collection: {collection_name}")
    else:
        print(f"ℹ️ Collection {collection_name} already exists. Appending...")

    vector_store = QdrantVectorStore(client=client, collection_name=collection_name)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    
    print("🧠 Loading local embedding model (BAAI/bge-small-en-v1.5)...")
    Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
    
    print(f"🧠 Generating embeddings locally and indexing into Qdrant...")
    index = VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        show_progress=True
    )
    print("✅ Ingestion complete! The AI agents now have an active semantic memory bank.")

def main():
    print("="*60)
    print("🧠 Chief of Staff — RAG Knowledge Base Ingestion")
    print("="*60)
    
    essays = load_essays()
    if not essays:
        return
        
    documents = build_llama_index_documents(essays)
    
    # Run ingestion
    ingest_to_qdrant(documents)

if __name__ == "__main__":
    main()
