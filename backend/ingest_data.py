import os
import shutil
from langchain_community.document_loaders import PyMuPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

DATA_DIR = "./data/docs"
VECTOR_DB_PATH = "./data/embeddings"

def load_documents():
    docs = []
    for file in os.listdir(DATA_DIR):
        file_path = os.path.join(DATA_DIR, file)
        if file.endswith(".pdf"):
            loader = PyMuPDFLoader(file_path)
            docs.extend(loader.load())
        elif file.endswith(".txt"):
            loader = TextLoader(file_path, encoding='utf-8')
            docs.extend(loader.load())
    print(f"[INFO] Loaded {len(docs)} raw documents.")
    return docs


def split_documents(docs):
    splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=150)
    chunks = splitter.split_documents(docs)
    print(f"[INFO] Split into {len(chunks)} chunks.")
    return chunks


def create_vector_store(docs):
    # Xóa database cũ (nếu có)
    if os.path.exists(VECTOR_DB_PATH):
        shutil.rmtree(VECTOR_DB_PATH)
        print("[INFO] Old vector store removed.")

    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    vector_store = Chroma.from_documents(docs, embeddings, persist_directory=VECTOR_DB_PATH)
    vector_store.persist()
    print("[INFO] Vector store created and saved successfully!")


if __name__ == "__main__":
    documents = load_documents()
    chunks = split_documents(documents)
    create_vector_store(chunks)
