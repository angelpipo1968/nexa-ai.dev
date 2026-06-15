"""
Nexa Agent Memory System
========================
Vector-based long-term memory using ChromaDB + sentence-transformers.
Stores conversations, facts, and knowledge for persistent agent memory.
"""
import os
import time
import uuid
from typing import Optional
from pathlib import Path

from config.settings import (
    MEMORY_DIR, CHROMA_PERSIST, CHROMA_COLLECTION,
    EMBEDDING_MODEL, MAX_MEMORY_RESULTS, CONVERSATION_WINDOW
)


class MemoryStore:
    """Persistent vector memory store using ChromaDB."""
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        """Singleton pattern - single ChromaDB connection."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, collection_name: Optional[str] = None):
        if self._initialized:
            return
        self._initialized = True
        
        try:
            import chromadb
            from chromadb.utils import embedding_functions
        except ImportError:
            raise ImportError("Install chromadb: pip install chromadb sentence-transformers")
        
        # Ensure directory exists
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        
        # Initialize embedding function
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL
        )
        
        # Initialize ChromaDB client
        if CHROMA_PERSIST:
            self.client = chromadb.PersistentClient(path=str(MEMORY_DIR))
        else:
            self.client = chromadb.Client()
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name or CHROMA_COLLECTION,
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )
        
        print(f"[Memory] Initialized: {self.collection.count()} memories stored")
    
    def add(self, text: str, metadata: Optional[dict] = None, doc_id: Optional[str] = None) -> str:
        """Add a memory entry.
        
        Args:
            text: The content to store
            metadata: Optional metadata (timestamp, source, type, etc.)
            doc_id: Optional document ID (auto-generated if not provided)
        
        Returns:
            The document ID
        """
        if not text.strip():
            return ""
        
        doc_id = doc_id or f"mem_{uuid.uuid4().hex[:12]}"
        metadata = metadata or {}
        metadata.setdefault("timestamp", time.strftime("%Y-%m-%d %H:%M:%S"))
        metadata.setdefault("source", "conversation")
        
        self.collection.add(
            documents=[text],
            metadatas=[metadata],
            ids=[doc_id]
        )
        
        return doc_id
    
    def add_conversation(self, user_msg: str, assistant_msg: str, context: str = "") -> str:
        """Store a conversation exchange as a memory.
        
        Args:
            user_msg: What the user said
            assistant_msg: What the assistant responded
            context: Optional context/tags for the exchange
        
        Returns:
            The memory document ID
        """
        text = f"User: {user_msg}\nAssistant: {assistant_msg}"
        if context:
            text = f"Context: {context}\n{text}"
        
        return self.add(
            text=text,
            metadata={
                "type": "conversation",
                "user_query": user_msg[:200],
                "context": context[:100] if context else "",
            }
        )
    
    def add_fact(self, fact: str, source: str = "learned", category: str = "general") -> str:
        """Store a learned fact or piece of knowledge.
        
        Args:
            fact: The fact to remember
            source: Where this fact came from
            category: Category of knowledge
        """
        return self.add(
            text=fact,
            metadata={
                "type": "fact",
                "source": source,
                "category": category,
            }
        )
    
    def search(self, query: str, n_results: int = MAX_MEMORY_RESULTS) -> dict:
        """Search memories by semantic similarity.
        
        Args:
            query: Search query
            n_results: Number of results to return
        
        Returns:
            ChromaDB query results
        """
        if self.collection.count() == 0:
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}
        
        return self.collection.query(
            query_texts=[query],
            n_results=min(n_results, self.collection.count()),
            include=["documents", "metadatas", "distances"]
        )
    
    def get_recent(self, n: int = CONVERSATION_WINDOW) -> list:
        """Get the most recently added memories.
        
        Args:
            n: Number of recent memories to retrieve
        
        Returns:
            List of recent memory entries
        """
        if self.collection.count() == 0:
            return []
        
        all_data = self.collection.get(
            include=["documents", "metadatas"],
            limit=n
        )
        
        return list(zip(all_data["documents"], all_data["metadatas"]))
    
    def delete(self, doc_id: str) -> bool:
        """Delete a specific memory by ID."""
        try:
            self.collection.delete(ids=[doc_id])
            return True
        except Exception:
            return False
    
    def clear_all(self) -> int:
        """Clear all memories. Returns count of deleted items."""
        count = self.collection.count()
        if count > 0:
            all_ids = self.collection.get()["ids"]
            self.collection.delete(ids=all_ids)
        return count
    
    def stats(self) -> dict:
        """Get memory store statistics."""
        return {
            "total_memories": self.collection.count(),
            "collection_name": self.collection.name,
            "persist_directory": str(MEMORY_DIR) if CHROMA_PERSIST else "in-memory",
            "embedding_model": EMBEDDING_MODEL,
        }


class ConversationBuffer:
    """Short-term conversation buffer (rolling window)."""
    
    def __init__(self, max_messages: int = CONVERSATION_WINDOW):
        self.max_messages = max_messages
        self.messages = []
    
    def add(self, role: str, content: str, metadata: Optional[dict] = None):
        """Add a message to the conversation buffer."""
        entry = {
            "role": role,
            "content": content,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        if metadata:
            entry["metadata"] = metadata
        
        self.messages.append(entry)
        
        # Trim to window size
        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages:]
    
    def get_langchain_format(self) -> list:
        """Get messages in LangChain format."""
        return [
            {"role": msg["role"], "content": msg["content"]}
            for msg in self.messages
        ]
    
    def get_openai_format(self) -> list:
        """Get messages in OpenAI chat format."""
        return self.get_langchain_format()
    
    def clear(self):
        """Clear the conversation buffer."""
        self.messages = []
    
    def summary(self) -> str:
        """Generate a brief summary of the conversation."""
        if not self.messages:
            return "Empty conversation."
        
        user_msgs = [m for m in self.messages if m["role"] == "user"]
        assistant_msgs = [m for m in self.messages if m["role"] == "assistant"]
        
        return (
            f"Conversation: {len(self.messages)} messages "
            f"({len(user_msgs)} user, {len(assistant_msgs)} assistant)"
        )
