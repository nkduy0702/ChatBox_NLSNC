import React, { useState, useEffect, useCallback } from "react";
import ChatBox from "./components/chatbox";
import History from "./components/history";
import "./App.css";

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  // 🟩 Lấy tất cả sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/sessions");
      const data = await res.json();
      setSessions(data || []);
    } catch (err) {
      console.error("❌ Lỗi tải sessions:", err);
    }
  }, []);

  // 🟩 Khi load lần đầu: chỉ fetch, không tạo session mới
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 🟩 Tạo session mới khi nhấn nút
  const handleNewSession = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/sessions", { method: "POST" });
      const newSession = await res.json();
      setCurrentSession(newSession);
      setSessions((prev) => [newSession, ...prev]);
    } catch (err) {
      console.error("❌ Lỗi tạo session:", err);
    }
  };

  // 🟩 Chọn session từ lịch sử
  const handleSelectSession = async (sessionId) => {
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
        </div>

        <button className="new-session-btn" onClick={handleNewSession}>
          ➕ Tạo Chat mới
        </button>

        <History history={sessions} onSelectHistory={handleSelectSession} />

        <div className="sidebar-info">
          <div><strong>📚 Chủ đề:</strong> Ngôn ngữ lập trình</div>
          <div><strong>🤖 Model:</strong> Gemma3 (Python + RAG)</div>
        </div>
      </aside>

      <main className="chat-area">
        {/* ✅ Truyền cả setCurrentSession để ChatBox có thể cập nhật */}
        <ChatBox
          currentSession={currentSession}
          setCurrentSession={setCurrentSession}
        />
      </main>
    </div>
  );
}

export default App;
