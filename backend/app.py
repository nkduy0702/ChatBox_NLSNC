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

os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)

# --- Kiểm tra Vector DB ---
if not os.path.exists(VECTOR_DB_PATH):
    raise RuntimeError("❌ Vector DB chưa được tạo. Hãy chạy ingest_data.py trước.")

# Embedding & VectorDB
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)
vector_store = Chroma(persist_directory=VECTOR_DB_PATH, embedding_function=embeddings)

# Model AI
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

# --- Lưu lịch sử ---
def save_sessions():
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(sessions, f, ensure_ascii=False, indent=2)

# --- Gọi Gemma ---
def query_gemma(prompt: str) -> str:
    try:
        response = client.chat(
            model=GEMMA_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        return response["message"]["content"]
    except Exception as e:
        print(f"---> Lỗi khi gọi Gemma: {e}")
        return "⚠️ Lỗi mô hình AI. Vui lòng thử lại sau."

# --- Tạo session ---
@app.route("/sessions", methods=["POST"])
def create_session():
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

# --- API Chat chính ---
@app.route("/chat", methods=["POST"])
def chat():
    global sessions
    data = request.json
    message = data.get("message", "").strip()
    session_id = data.get("session_id")
    threshold = float(data.get("threshold", 10))

    if not message:
        return jsonify({"response": "❌ Bạn chưa nhập câu hỏi."})

    # --- Kiểm tra session ---
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

    # --- 3 mức threshold ---
    thresholds = [
        threshold,
        max(threshold - 3, 0),
        max(threshold - 6, 0)
    ]

    multi_answers = []

    for th in thresholds:
        # Tài liệu đạt yêu cầu với threshold hiện tại
        filtered_docs_info = [d for d in docs_info if d["score"] <= th]
        filtered_docs = [d["doc"] for d in filtered_docs_info]

        # Lọc trùng và lấy tài liệu tham khảo
        seen = set()
        referenced_files = []
        for d in filtered_docs_info:
            if d["source"] not in seen:
                referenced_files.append({
                    "name": d["source"],
                    "score": round(d["score"], 3)
                })
                seen.add(d["source"])

        # Nếu không có tài liệu, bỏ qua threshold
        if filtered_docs:
            context_text = "\n\n".join([d.page_content[:1000] for d in filtered_docs])[:3000]
            prompt = (
                f"Bạn là trợ lý AI hỗ trợ CNTT dựa trên tài liệu.\n"
                f"Threshold hiện tại: {th}\n\n"
                f"Tài liệu tham khảo:\n{context_text}\n\n"
                f"Câu hỏi: {message}\n"
                f"Hãy trả lời chính xác và chỉ dựa trên tài liệu."
            )
            answer = query_gemma(prompt)
            multi_answers.append({
                "threshold": th,
                "answer": answer,
                "referenced_files": referenced_files
            })

    # --- Nếu không có tài liệu ở tất cả threshold ---
    if not multi_answers:
        multi_answers.append({
            "threshold": threshold,
            "answer": "⚠️ Không có tài liệu liên quan. Bot sẽ không trả lời.",
            "referenced_files": []
        })

    # --- Lưu vào lịch sử ---
    current_session["messages"].append({
        "role": "user",
        "text": message,
        "threshold": threshold
    })
    current_session["messages"].append({
        "role": "bot",
        "threshold_used": multi_answers
    })
    save_sessions()

    # --- Trả về FE ---
    return jsonify({
        "responses": multi_answers,
        "session_id": session_id,
        "timestamp": current_session["timestamp"]
    })

# --- GET tất cả session ---
@app.route("/sessions", methods=["GET"])
def get_sessions():
    return jsonify([{"id": s["id"], "timestamp": s["timestamp"], "topic": s["topic"]} for s in reversed(sessions)])

# --- Lấy chi tiết session ---
@app.route("/sessions/<session_id>", methods=["GET"])
def get_session(session_id):
    session = next((s for s in sessions if s["id"] == session_id), None)
    if not session:
        return jsonify({"error": "Session không tồn tại"}), 404
    return jsonify(session)

# --- Chạy server ---
if __name__ == "__main__":
    app.run(debug=True, port=5000)
