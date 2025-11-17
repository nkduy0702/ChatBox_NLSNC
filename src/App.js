import React, { useState, useEffect, useCallback } from "react";
import ChatBox from "./components/chatbox";
import History from "./components/history";
import "./App.css";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  // --- Fetch danh sách session từ BE ---
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/sessions");
      const data = await res.json();
      setSessions(data || []);
    } catch (err) {
      console.error("❌ Lỗi tải sessions:", err);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // --- Tạo session tạm khi nhấn Create ---
  const handleNewSession = () => {
    const now = new Date();
    const formattedTime = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(
      now.getHours()
    ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
      now.getSeconds()
    ).padStart(2, "0")}`;

    const tempSession = {
      id: null,
      timestamp: formattedTime,
      topic: "",
      messages: [],
      isNew: true,
    };

    setCurrentSession(tempSession);

    // Thêm tạm vào sidebar liền
    setSessions((prev) => [tempSession, ...prev]);
  };

  // --- Chọn session từ sidebar ---
  const handleSelectSession = async (sessionId) => {
    if (!sessionId) return;

    try {
      const res = await fetch(`http://127.0.0.1:5000/sessions/${sessionId}`);
      const data = await res.json();
      setCurrentSession(data);
    } catch (err) {
      console.error("❌ Lỗi tải session:", err);
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>SmartEdu AI</h2>
          <div className="subtitle">Trợ lý học tập thông minh</div>
          <button className="new-btn" onClick={handleNewSession}>
            <span>
              <svg
                height="24"
                width="24"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M0 0h24v24H0z" fill="none"></path>
                <path
                  d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"
                  fill="currentColor"
                ></path>
              </svg>
              Create
            </span>
          </button>
        </div>

        <History
          history={sessions}
          onSelectHistory={handleSelectSession}
          currentSessionId={currentSession?.id}
        />

        <div className="sidebar-info">
          <div>
            <strong>📚 Chủ đề:</strong> Ngôn ngữ lập trình
          </div>
          <div>
            <strong>🤖 Model:</strong> Gemma3 (Python + RAG)
          </div>
        </div>
      </aside>

      <main className="chat-area">
        <ChatBox
          currentSession={currentSession}
          setCurrentSession={setCurrentSession}
          setSessions={setSessions}
        />
      </main>
    </div>
  );
}

export default App;
