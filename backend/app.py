import os
import uuid
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from ollama import Client

# --- Cấu hình ---
VECTOR_DB_PATH = "./data/embeddings"
GEMMA_MODEL = "gemma3:1b"
HISTORY_FILE = "./chatHistory/history.json"
SIMILARITY_THRESHOLD = 8.0  # Ngưỡng distance để xem tài liệu có liên quan

os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)

# --- Khởi tạo vector store ---
if not os.path.exists(VECTOR_DB_PATH):
    raise RuntimeError("❌ Vector DB chưa được tạo. Hãy chạy ingest_data.py trước.")

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
vector_store = Chroma(persist_directory=VECTOR_DB_PATH, embedding_function=embeddings)
client = Client()

app = Flask(__name__)
CORS(app)

# --- Load history ---
if os.path.exists(HISTORY_FILE):
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
        try:
            sessions = json.load(f)
        except:
            sessions = []
else:
    sessions = []

# --- Save history ---
def save_sessions():
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(sessions, f, ensure_ascii=False, indent=2)

# --- Gọi Gemma ---
def query_gemma(prompt: str) -> str:
    try:
        response = client.chat(model=GEMMA_MODEL, messages=[{"role": "user", "content": prompt}])
        return response["message"]["content"]
    except Exception as e:
        print(f"---> Lỗi khi gọi Gemma: {e}")
        return "Xin lỗi, hiện tại không thể trả lời. Vui lòng thử lại sau."

# --- POST /sessions ---
@app.route("/sessions", methods=["POST"])
def create_session():
    global sessions
    session_id = str(uuid.uuid4())
    session = {
        "id": session_id,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "topic": "",
        "messages": []
    }
    sessions.append(session)
    save_sessions()
    return jsonify(session)

# --- POST /chat ---
@app.route("/chat", methods=["POST"])
def chat():
    global sessions
    data = request.json
    message = data.get("message", "").strip()
    session_id = data.get("session_id")

    if not message:
        return jsonify({"response": "❌ Bạn chưa nhập câu hỏi."})

    # --- Kiểm tra session hợp lệ ---
    if not session_id or session_id not in [s["id"] for s in sessions]:
        session_id = str(uuid.uuid4())
        current_session = {
            "id": session_id,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "topic": "",
            "messages": []
        }
        sessions.append(current_session)
    else:
        current_session = next(s for s in sessions if s["id"] == session_id)

    if current_session["topic"] == "":
        current_session["topic"] = message[:50]

    # --- Tìm tài liệu ---
    results = vector_store.similarity_search_with_score(message, k=5)
    docs_info = [
        {"doc": doc, "score": score, "source": doc.metadata.get("source", "Unknown")}
        for doc, score in results
    ]
    docs = [d["doc"] for d in docs_info]

    # --- PRINT để debug điểm ---
    print("\n--- Kết quả tìm kiếm tài liệu ---")
    for d in docs_info:
        print(f"File: {d['source']}, Score: {d['score']:.3f}")
    print("--------------------------------\n")

    # --- Lọc tài liệu theo ngưỡng ---
    filtered_docs_info = [d for d in docs_info if d["score"] <= SIMILARITY_THRESHOLD]
    filtered_docs = [d["doc"] for d in filtered_docs_info]

    # --- Loại bỏ trùng tên tài liệu ---
    seen_sources = set()
    unique_referenced_files = []
    for d in filtered_docs_info:
        if d["source"] not in seen_sources:
            unique_referenced_files.append({"name": d["source"], "score": round(d["score"], 3)})
            seen_sources.add(d["source"])

    # --- Tạo prompt chuẩn ---
    if filtered_docs:
        context_text = "\n\n".join([d.page_content[:1000] for d in filtered_docs])[:3000]
        prompt = (
            f"Bạn là trợ lý thông minh hỗ trợ trả lời câu hỏi về CNTT dựa trên các tài liệu đã cho.\n"
            f"Tài liệu tham khảo:\n{context_text}\n\n"
            f"Câu hỏi của người dùng: {message}\n"
            f"Hãy trả lời chính xác và chi tiết, bằng tiếng Việt, dựa trên các tài liệu. "
            f"Đừng thêm thông tin ngoài dữ liệu."
        )
        answer = query_gemma(prompt)
    else:
        answer = "⚠️ Không có tài liệu liên quan. Bot sẽ không trả lời."

    # --- Cập nhật session, lưu lịch sử luôn ---
    current_session["messages"].append({"role": "user", "text": message})
    current_session["messages"].append({"role": "bot", "text": answer})
    save_sessions()

    return jsonify({
        "response": answer,
        "session_id": session_id,
        "timestamp": current_session["timestamp"],
        "referenced_files": unique_referenced_files
    })

# --- GET /sessions ---
@app.route("/sessions", methods=["GET"])
def get_sessions():
    return jsonify([{"id": s["id"], "timestamp": s["timestamp"], "topic": s["topic"]} for s in reversed(sessions)])

# --- GET /sessions/<id> ---
@app.route("/sessions/<session_id>", methods=["GET"])
def get_session(session_id):
    session = next((s for s in sessions if s["id"] == session_id), None)
    if not session:
        return jsonify({"error": "Session không tồn tại"}), 404
    return jsonify(session)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
