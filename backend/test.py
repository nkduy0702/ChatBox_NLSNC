from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

VECTOR_DB_PATH = "./data/embeddings"
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
vector_store = Chroma(persist_directory=VECTOR_DB_PATH, embedding_function=embeddings)

print("Số lượng vector trong DB:", vector_store._collection.count())

results = vector_store.similarity_search_with_score("ví dụ câu hỏi về lập trình", k=5)
for doc, score in results:
    print(score, doc.page_content[:100])
