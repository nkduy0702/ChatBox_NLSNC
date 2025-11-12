import React, { useState, useEffect } from "react";
import ChatBox from "./components/chatbox";
import History from "./components/history";
import "./App.css";

function App() {
  const [history, setHistory] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  // ✅ Tải lịch sử khi load trang
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/history");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error("❌ Lỗi tải lịch sử:", err);
    }
  };

  // ✅ Khi bấm chọn 1 hội thoại trong lịch sử
  const handleSelectHistory = async (chatId) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/history/${chatId}`);
      const data = await res.json();
      setSelectedChat(data);
    } catch (err) {
      console.error("❌ Lỗi tải lại hội thoại:", err);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <h2>SmartEdu AI</h2>
            <div className="subtitle">Trợ lý học tập thông minh</div>
          </div>

          {/* ✅ Gọi component History */}
          <History history={history} onSelectHistory={handleSelectHistory} />
        </div>

        <div className="sidebar-info">
          <div>
            <strong>📚 Chủ đề:</strong>
            <span> Công nghệ phần mềm</span>
          </div>
          <div>
            <strong>🤖 Model:</strong>
            <span> Gemma3 (Finetune - Model)</span>
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="chat-area">
        <ChatBox selectedChat={selectedChat} />
      </main>
    </div>
  );
}

export default App;
